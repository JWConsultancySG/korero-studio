-- Prevent recursive RLS evaluation for admin checks.
-- profiles policies reference is_korero_admin(), and is_korero_admin() reads
-- profiles, so it must bypass RLS internally.

CREATE OR REPLACE FUNCTION public.is_korero_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT
    coalesce((auth.jwt() -> 'app_metadata' ->> 'korero_admin')::boolean, false)
    OR coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.app_role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_korero_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_korero_admin() TO authenticated;
