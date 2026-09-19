-- ==============================================================================
-- GEMSTONE PROCESSING & LIFECYCLE MANAGEMENT SYSTEM
-- PRODUCTION DATABASE INITIALIZATION & HARDENED RLS SCHEMA
-- ==============================================================================
-- Execute this entire file in your Supabase SQL Editor for production deployment.
-- This script sets up tables, types, triggers, views, storage, and strict RBAC.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lot_stage_enum') THEN
    CREATE TYPE lot_stage_enum AS ENUM (
      'PROCUREMENT',
      'PERFORMING',
      'GAS_BURN',
      'CUT_POLISH',
      'ELECTRIC_BURN',
      'CERTIFICATION',
      'SELL_READY'
    );
  END IF;
END $$;

-- 3. CORE TABLES

-- PROFILES (User Roles & Metadata)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SYSTEM CONFIG (Master configuration & lists)
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LOTS (Gemstone Lot Registry)
CREATE TABLE IF NOT EXISTS public.lots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lot_code TEXT UNIQUE NOT NULL,
  supplier TEXT,
  purchase_date DATE,
  purchase_price NUMERIC CHECK (purchase_price >= 0),
  initial_weight NUMERIC CHECK (initial_weight >= 0),
  current_weight NUMERIC CHECK (current_weight >= 0),
  current_stage lot_stage_enum NOT NULL DEFAULT 'PROCUREMENT',
  is_finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STAGE LOGS (Immutable Stage Transition History)
CREATE TABLE IF NOT EXISTS public.stage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lot_id UUID REFERENCES public.lots(id) ON DELETE CASCADE NOT NULL,
  stage lot_stage_enum NOT NULL,
  sequence_number INTEGER CHECK (sequence_number >= 1 AND sequence_number <= 20),
  entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exited_at TIMESTAMP WITH TIME ZONE,
  data JSONB DEFAULT '{}'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  cost NUMERIC DEFAULT 0 CHECK (cost >= 0),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_active_stage UNIQUE (lot_id, exited_at)
);

-- Unique index enforcing exactly one currently active stage (where exited_at IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS one_active_stage_per_lot_idx 
  ON public.stage_logs (lot_id) 
  WHERE exited_at IS NULL;

-- PROCESSING COSTS (Granular expense auditing)
CREATE TABLE IF NOT EXISTS public.processing_costs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lot_id UUID REFERENCES public.lots(id) ON DELETE CASCADE NOT NULL,
  stage lot_stage_enum NOT NULL,
  cost_type TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LOT ASSETS (High-res photography & lab certificates)
CREATE TABLE IF NOT EXISTS public.lot_assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lot_id UUID REFERENCES public.lots(id) ON DELETE CASCADE NOT NULL,
  stage lot_stage_enum,
  file_path TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. VIEWS

-- Financial Snapshot
CREATE OR REPLACE VIEW public.lot_financial_snapshot AS
SELECT 
  l.id,
  l.lot_code,
  l.current_stage,
  l.initial_weight,
  l.current_weight,
  (l.initial_weight - l.current_weight) AS total_loss,
  (
    l.purchase_price + 
    COALESCE((SELECT SUM(cost) FROM public.stage_logs WHERE lot_id = l.id), 0) +
    COALESCE((SELECT SUM(amount) FROM public.processing_costs WHERE lot_id = l.id), 0)
  ) AS total_cost
FROM public.lots l;

-- Export View (Dossier & Reporting)
CREATE OR REPLACE VIEW public.lot_export_view AS
SELECT
  l.id,
  l.lot_code,
  l.supplier,
  l.purchase_date,
  l.current_stage,
  l.is_finalized,
  l.initial_weight,
  l.current_weight,
  snap.total_cost,
  snap.total_loss,
  (SELECT data->>'sold_price' FROM public.stage_logs WHERE lot_id = l.id AND stage = 'SELL_READY') AS sold_price,
  (SELECT data->>'buyer' FROM public.stage_logs WHERE lot_id = l.id AND stage = 'SELL_READY') AS buyer
FROM public.lots l
JOIN public.lot_financial_snapshot snap ON snap.id = l.id;

-- 5. INITIAL MASTER CONFIGURATION
INSERT INTO public.system_config (key, value) VALUES 
('colors', '["BLUE", "SILK", "GEUDA", "YELLOW", "PADPARADSCHA", "RUBY"]'::jsonb),
('clarity_levels', '["HIGH", "MEDIUM", "LOW", "EYE_CLEAN"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 6. USER SIGNUP TRIGGER & PROFILE AUTOMATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. RBAC HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_assets ENABLE ROW LEVEL SECURITY;

-- REVOKE dangerous development bypasses
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

DROP POLICY IF EXISTS "Enable access for anon users" ON public.lots;
DROP POLICY IF EXISTS "Enable access for anon users" ON public.stage_logs;
DROP POLICY IF EXISTS "Enable access for anon users" ON public.processing_costs;
DROP POLICY IF EXISTS "Enable access for anon users" ON public.lot_assets;
DROP POLICY IF EXISTS "Enable access for anon users" ON public.system_config;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- SYSTEM CONFIG POLICIES
DROP POLICY IF EXISTS "Config viewable by authenticated" ON public.system_config;
CREATE POLICY "Config viewable by authenticated"
  ON public.system_config FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage config" ON public.system_config;
CREATE POLICY "Admins can manage config"
  ON public.system_config FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- LOTS POLICIES
DROP POLICY IF EXISTS "Anyone can view lots" ON public.lots;
DROP POLICY IF EXISTS "Authenticated users can view lots" ON public.lots;
CREATE POLICY "Authenticated users can view lots"
  ON public.lots FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can insert lots" ON public.lots;
CREATE POLICY "Only admins can insert lots"
  ON public.lots FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can update lots" ON public.lots;
CREATE POLICY "Only admins can update lots"
  ON public.lots FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete lots" ON public.lots;
CREATE POLICY "Only admins can delete lots"
  ON public.lots FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- STAGE LOGS POLICIES
DROP POLICY IF EXISTS "Anyone can view stage_logs" ON public.stage_logs;
DROP POLICY IF EXISTS "Authenticated users can view stage_logs" ON public.stage_logs;
CREATE POLICY "Authenticated users can view stage_logs"
  ON public.stage_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can insert stage_logs" ON public.stage_logs;
CREATE POLICY "Only admins can insert stage_logs"
  ON public.stage_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can update stage_logs" ON public.stage_logs;
CREATE POLICY "Only admins can update stage_logs"
  ON public.stage_logs FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete stage_logs" ON public.stage_logs;
CREATE POLICY "Only admins can delete stage_logs"
  ON public.stage_logs FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- PROCESSING COSTS POLICIES
DROP POLICY IF EXISTS "Authenticated can view costs" ON public.processing_costs;
CREATE POLICY "Authenticated can view costs"
  ON public.processing_costs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can insert costs" ON public.processing_costs;
CREATE POLICY "Only admins can insert costs"
  ON public.processing_costs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can update costs" ON public.processing_costs;
CREATE POLICY "Only admins can update costs"
  ON public.processing_costs FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete costs" ON public.processing_costs;
CREATE POLICY "Only admins can delete costs"
  ON public.processing_costs FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- LOT ASSETS POLICIES
DROP POLICY IF EXISTS "Authenticated can view assets" ON public.lot_assets;
CREATE POLICY "Authenticated can view assets"
  ON public.lot_assets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can insert assets" ON public.lot_assets;
CREATE POLICY "Only admins can insert assets"
  ON public.lot_assets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can update assets" ON public.lot_assets;
CREATE POLICY "Only admins can update assets"
  ON public.lot_assets FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete assets" ON public.lot_assets;
CREATE POLICY "Only admins can delete assets"
  ON public.lot_assets FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 9. STORAGE BUCKET CONFIGURATION (lot-evidence)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lot-evidence',
  'lot-evidence',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Storage bucket access policies
DROP POLICY IF EXISTS "Public View Lot Evidence" ON storage.objects;
CREATE POLICY "Public View Lot Evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lot-evidence');

DROP POLICY IF EXISTS "Authenticated Upload Lot Evidence" ON storage.objects;
CREATE POLICY "Authenticated Upload Lot Evidence"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lot-evidence');

DROP POLICY IF EXISTS "Admin Delete Lot Evidence" ON storage.objects;
CREATE POLICY "Admin Delete Lot Evidence"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'lot-evidence' AND public.is_admin());

-- ==============================================================================
-- 10. POST-DEPLOYMENT: ASSIGN YOUR FIRST ADMIN USER
-- After the first user creates an account at /signup, run the following SQL:
-- UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@company.com');
-- ==============================================================================

-- ==============================================================================
-- 11. KEEP-ALIVE HEALTH CHECK (prevents free-tier inactivity pausing)
-- Called by .github/workflows/supabase-keepalive.yml. Returns only the server time.
-- Must stay AFTER the "REVOKE ... FROM anon" statements above.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.keepalive()
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT now();
$$;

REVOKE ALL ON FUNCTION public.keepalive() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.keepalive() TO anon, authenticated;
