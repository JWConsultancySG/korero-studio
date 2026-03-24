-- Avoid recursive RLS on group_enrollments: EXISTS (SELECT ... FROM group_enrollments)
-- re-evaluates policies on the same table and can cause PostgREST errors (often logged as {}).
-- SECURITY DEFINER reads enrollments with owner privileges — no RLS recursion.

CREATE OR REPLACE FUNCTION public.korero_user_enrolled_in_group(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_enrollments ge
    WHERE ge.group_id = p_group_id
      AND ge.student_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.korero_user_enrolled_in_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.korero_user_enrolled_in_group(uuid) TO authenticated;

DROP POLICY IF EXISTS "group_enrollments_select_member_or_peer" ON public.group_enrollments;
CREATE POLICY "group_enrollments_select_member_or_peer" ON public.group_enrollments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.korero_user_enrolled_in_group(group_id)
    OR public.is_korero_admin()
  );
