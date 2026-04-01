-- Allow admin users to manage studios and studio availability.

ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_availability_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studios_insert_admin" ON public.studios;
CREATE POLICY "studios_insert_admin"
  ON public.studios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.app_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "studios_update_admin" ON public.studios;
CREATE POLICY "studios_update_admin"
  ON public.studios
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.app_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.app_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "studios_delete_admin" ON public.studios;
CREATE POLICY "studios_delete_admin"
  ON public.studios
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.app_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "studio_availability_insert_admin" ON public.studio_availability_slots;
CREATE POLICY "studio_availability_insert_admin"
  ON public.studio_availability_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.app_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "studio_availability_update_admin" ON public.studio_availability_slots;
CREATE POLICY "studio_availability_update_admin"
  ON public.studio_availability_slots
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.app_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.app_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "studio_availability_delete_admin" ON public.studio_availability_slots;
CREATE POLICY "studio_availability_delete_admin"
  ON public.studio_availability_slots
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.app_role = 'admin'
    )
  );
