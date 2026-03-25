-- Allow assigned instructors to read class member enrollments.
-- This fixes empty overlap views for instructors who have joined via
-- class_instructor_assignments rather than class_enrollments.

CREATE OR REPLACE FUNCTION public.korero_user_assigned_instructor_in_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_instructor_assignments cia
    WHERE cia.class_id = p_class_id
      AND cia.instructor_id = auth.uid()
      AND cia.status IN ('pending', 'confirmed')
  );
$$;

REVOKE ALL ON FUNCTION public.korero_user_assigned_instructor_in_class(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.korero_user_assigned_instructor_in_class(uuid) TO authenticated;

DROP POLICY IF EXISTS "class_enrollments_select_member_or_peer" ON public.class_enrollments;
CREATE POLICY "class_enrollments_select_member_or_peer"
  ON public.class_enrollments
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.korero_user_enrolled_in_group(class_id)
    OR public.korero_user_assigned_instructor_in_class(class_id)
    OR public.is_korero_admin()
  );
