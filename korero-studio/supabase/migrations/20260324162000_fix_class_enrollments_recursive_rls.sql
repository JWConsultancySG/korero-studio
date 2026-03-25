-- Prevent recursive RLS evaluation on class_enrollments.
-- The select policy calls this helper, so the helper itself must not be
-- subject to class_enrollments RLS checks.

CREATE OR REPLACE FUNCTION public.korero_user_enrolled_in_group(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_enrollments ce
    WHERE ce.class_id = p_group_id
      AND ce.student_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.korero_user_enrolled_in_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.korero_user_enrolled_in_group(uuid) TO authenticated;
