-- Reconcile matching-table RLS after groups -> classes rename.
-- These gaps can cause silent failures in selectGroupStudio / confirmInstructorAssignment.

-- Ensure read policy exists on renamed instructor assignments table.
DROP POLICY IF EXISTS "group_instructor_select_authenticated" ON public.class_instructor_assignments;
DROP POLICY IF EXISTS "class_instructor_select_authenticated" ON public.class_instructor_assignments;
CREATE POLICY "class_instructor_select_authenticated"
  ON public.class_instructor_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep instructor self-request inserts working after rename.
DROP POLICY IF EXISTS "group_instructor_insert_own" ON public.class_instructor_assignments;
DROP POLICY IF EXISTS "class_instructor_insert_own" ON public.class_instructor_assignments;
CREATE POLICY "class_instructor_insert_own"
  ON public.class_instructor_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (instructor_id = auth.uid());

-- Admin must be able to confirm/reject assignments.
DROP POLICY IF EXISTS "class_instructor_update_admin" ON public.class_instructor_assignments;
CREATE POLICY "class_instructor_update_admin"
  ON public.class_instructor_assignments
  FOR UPDATE
  TO authenticated
  USING (public.is_korero_admin())
  WITH CHECK (public.is_korero_admin());

-- Optional cleanup capability for admin operations.
DROP POLICY IF EXISTS "class_instructor_delete_admin" ON public.class_instructor_assignments;
CREATE POLICY "class_instructor_delete_admin"
  ON public.class_instructor_assignments
  FOR DELETE
  TO authenticated
  USING (public.is_korero_admin());

-- Studio selection needs write policies (used by selectGroupStudio upsert).
DROP POLICY IF EXISTS "group_studio_selection_select_authenticated" ON public.class_studio_selection;
DROP POLICY IF EXISTS "class_studio_selection_select_authenticated" ON public.class_studio_selection;
CREATE POLICY "class_studio_selection_select_authenticated"
  ON public.class_studio_selection
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "class_studio_selection_insert_authenticated" ON public.class_studio_selection;
CREATE POLICY "class_studio_selection_insert_authenticated"
  ON public.class_studio_selection
  FOR INSERT
  TO authenticated
  WITH CHECK (selected_by = auth.uid() OR public.is_korero_admin());

DROP POLICY IF EXISTS "class_studio_selection_update_authenticated" ON public.class_studio_selection;
CREATE POLICY "class_studio_selection_update_authenticated"
  ON public.class_studio_selection
  FOR UPDATE
  TO authenticated
  USING (selected_by = auth.uid() OR public.is_korero_admin())
  WITH CHECK (selected_by = auth.uid() OR public.is_korero_admin());

DROP POLICY IF EXISTS "class_studio_selection_delete_admin" ON public.class_studio_selection;
CREATE POLICY "class_studio_selection_delete_admin"
  ON public.class_studio_selection
  FOR DELETE
  TO authenticated
  USING (public.is_korero_admin());

