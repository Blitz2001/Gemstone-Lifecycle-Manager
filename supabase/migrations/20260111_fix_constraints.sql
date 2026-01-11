-- Drop the restrictive check constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Ensure the role column accepts our new values ('user', 'admin')
-- We don't strictly need a new check constraint right now, allowing free text or adding a new check is fine.
-- Let's just drop the old one to unblock creation.

-- Also ensure the default is what we want
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

-- Verify handle_new_user function is correct (just in case)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
