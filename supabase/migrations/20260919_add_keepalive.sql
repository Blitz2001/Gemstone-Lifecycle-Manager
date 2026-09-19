-- Migration: 20260919_add_keepalive.sql
-- Description: Minimal public health-check function used by the scheduled keep-alive
-- workflow (.github/workflows/supabase-keepalive.yml) so free-tier projects are not
-- paused for inactivity. It reads no table data and returns only the server time.

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
