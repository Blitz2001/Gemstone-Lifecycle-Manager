-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Set existing users as admin (for backward compatibility)
UPDATE profiles SET role = 'admin' WHERE role IS NULL OR role = 'user';

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- LOTS TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view lots" ON lots;
DROP POLICY IF EXISTS "Only admins can insert lots" ON lots;
DROP POLICY IF EXISTS "Only admins can update lots" ON lots;
DROP POLICY IF EXISTS "Only admins can delete lots" ON lots;

-- Anyone can view lots
CREATE POLICY "Anyone can view lots"
  ON lots FOR SELECT
  USING (true);

-- Only admins can insert lots
CREATE POLICY "Only admins can insert lots"
  ON lots FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update lots
CREATE POLICY "Only admins can update lots"
  ON lots FOR UPDATE
  USING (is_admin());

-- Only admins can delete lots
CREATE POLICY "Only admins can delete lots"
  ON lots FOR DELETE
  USING (is_admin());

-- ============================================
-- STAGE_LOGS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view stage_logs" ON stage_logs;
DROP POLICY IF EXISTS "Only admins can insert stage_logs" ON stage_logs;
DROP POLICY IF EXISTS "Only admins can update stage_logs" ON stage_logs;
DROP POLICY IF EXISTS "Only admins can delete stage_logs" ON stage_logs;

CREATE POLICY "Anyone can view stage_logs"
  ON stage_logs FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert stage_logs"
  ON stage_logs FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update stage_logs"
  ON stage_logs FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete stage_logs"
  ON stage_logs FOR DELETE
  USING (is_admin());

-- ============================================
-- LOT_ASSETS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view lot_assets" ON lot_assets;
DROP POLICY IF EXISTS "Only admins can insert lot_assets" ON lot_assets;
DROP POLICY IF EXISTS "Only admins can update lot_assets" ON lot_assets;
DROP POLICY IF EXISTS "Only admins can delete lot_assets" ON lot_assets;

CREATE POLICY "Anyone can view lot_assets"
  ON lot_assets FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert lot_assets"
  ON lot_assets FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update lot_assets"
  ON lot_assets FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete lot_assets"
  ON lot_assets FOR DELETE
  USING (is_admin());

-- Note: capital_investments table policies would go here if the table exists
-- Skipping for now as the table doesn't exist in the current schema
