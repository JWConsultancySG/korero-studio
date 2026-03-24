DROP POLICY IF EXISTS "group_enrollments_update_own" ON public.group_enrollments;

CREATE POLICY "group_enrollments_update_own_or_admin" ON public.group_enrollments FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR public.is_korero_admin())
  WITH CHECK (student_id = auth.uid() OR public.is_korero_admin());
