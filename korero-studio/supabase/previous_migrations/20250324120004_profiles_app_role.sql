-- App roles (student / instructor / admin) live on profiles — single source of truth for access control.
-- Bootstrap: set your first admin in SQL Editor: UPDATE public.profiles SET app_role = 'admin' WHERE email = 'you@example.com';

CREATE TYPE public.user_app_role AS ENUM ('student', 'instructor', 'admin');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_role public.user_app_role NOT NULL DEFAULT 'student';

COMMENT ON COLUMN public.profiles.app_role IS 'Application role: student, instructor, or admin.';

-- RLS-safe: read role without relying on JWT app_metadata or env.
CREATE OR REPLACE FUNCTION public.is_korero_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.app_role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_korero_instructor_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.app_role IN ('instructor', 'admin')
  );
$$;

-- Admins can list all profiles (user management).
CREATE POLICY "profiles_select_all_if_admin" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_korero_admin());

-- Admins can update any profile (role changes, support).
CREATE POLICY "profiles_update_if_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_korero_admin())
  WITH CHECK (public.is_korero_admin());
