-- Allow any authenticated user to read class_enrollments.
-- Previously, only enrolled members / assigned instructors / admins
-- could see enrollments, which meant a student about to join could
-- not see which positions were already taken.
-- Enrollment data (slot_label, student_name) is public coordination
-- data shown on the class detail page, so this is safe.

DROP POLICY IF EXISTS "class_enrollments_select_member_or_peer" ON public.class_enrollments;
CREATE POLICY "class_enrollments_select_authenticated"
  ON public.class_enrollments
  FOR SELECT
  TO authenticated
  USING (true);
