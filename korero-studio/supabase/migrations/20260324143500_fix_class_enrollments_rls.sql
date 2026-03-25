-- Fix RLS helpers/policies after groups -> classes rename.
-- Symptoms: enrollments appear empty in matcher / overlap views.

CREATE OR REPLACE FUNCTION public.is_korero_admin()
RETURNS boolean
LANGUAGE sql
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

CREATE OR REPLACE FUNCTION public.korero_user_enrolled_in_group(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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

DROP POLICY IF EXISTS "group_enrollments_select_member_or_peer" ON public.class_enrollments;
DROP POLICY IF EXISTS "class_enrollments_select_member_or_peer" ON public.class_enrollments;
CREATE POLICY "class_enrollments_select_member_or_peer"
  ON public.class_enrollments
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.korero_user_enrolled_in_group(class_id)
    OR public.is_korero_admin()
  );

DROP POLICY IF EXISTS "group_enrollments_delete_own_or_admin" ON public.class_enrollments;
DROP POLICY IF EXISTS "class_enrollments_delete_own_or_admin" ON public.class_enrollments;
CREATE POLICY "class_enrollments_delete_own_or_admin"
  ON public.class_enrollments
  FOR DELETE
  TO authenticated
  USING (student_id = auth.uid() OR public.is_korero_admin());

-- Keep anonymous browse for classes after rename from song_groups.
DROP POLICY IF EXISTS "song_groups_select_anon" ON public.classes;
DROP POLICY IF EXISTS "classes_select_anon" ON public.classes;
CREATE POLICY "classes_select_anon"
  ON public.classes
  FOR SELECT
  TO anon
  USING (true);

