-- Admin JWT helper + anon browse + policies for Korero (tighten admin-only reads, credit inserts).

CREATE OR REPLACE FUNCTION public.is_korero_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'korero_admin')::boolean, false)
    OR coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- Public browse (landing / groups without sign-in)
CREATE POLICY "song_groups_select_anon" ON public.song_groups FOR SELECT TO anon USING (true);
CREATE POLICY "song_catalog_select_anon" ON public.song_catalog FOR SELECT TO anon USING (true);
CREATE POLICY "booking_time_slot_templates_select_anon" ON public.booking_time_slot_templates FOR SELECT TO anon USING (true);

-- Tighten admin alerts: admins only
DROP POLICY IF EXISTS "admin_alerts_select_authenticated" ON public.admin_alerts;
CREATE POLICY "admin_alerts_select_admin" ON public.admin_alerts FOR SELECT TO authenticated USING (public.is_korero_admin());
CREATE POLICY "admin_alerts_insert_admin" ON public.admin_alerts FOR INSERT TO authenticated WITH CHECK (public.is_korero_admin());
CREATE POLICY "admin_alerts_update_admin" ON public.admin_alerts FOR UPDATE TO authenticated USING (public.is_korero_admin()) WITH CHECK (public.is_korero_admin());
CREATE POLICY "admin_alerts_delete_admin" ON public.admin_alerts FOR DELETE TO authenticated USING (public.is_korero_admin());

-- Song groups: creator or admin can update/delete; insert must set creator
DROP POLICY IF EXISTS "song_groups_insert_authenticated" ON public.song_groups;
DROP POLICY IF EXISTS "song_groups_update_creator" ON public.song_groups;

CREATE POLICY "song_groups_insert_authenticated" ON public.song_groups FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "song_groups_update_creator_or_admin" ON public.song_groups FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() OR public.is_korero_admin())
  WITH CHECK (creator_id = auth.uid() OR public.is_korero_admin());

CREATE POLICY "song_groups_delete_creator_or_admin" ON public.song_groups FOR DELETE TO authenticated
  USING (creator_id = auth.uid() OR public.is_korero_admin());

-- Enrollments: peers + admin (matcher / admin panel)
DROP POLICY IF EXISTS "group_enrollments_select_member_or_peer" ON public.group_enrollments;
CREATE POLICY "group_enrollments_select_member_or_peer" ON public.group_enrollments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.group_enrollments ge2
      WHERE ge2.group_id = group_id
        AND ge2.student_id = auth.uid()
    )
    OR public.is_korero_admin()
  );

CREATE POLICY "group_enrollments_delete_own_or_admin" ON public.group_enrollments FOR DELETE TO authenticated
  USING (student_id = auth.uid() OR public.is_korero_admin());

-- Song catalog: admin writes
CREATE POLICY "song_catalog_insert_admin" ON public.song_catalog FOR INSERT TO authenticated WITH CHECK (public.is_korero_admin());
CREATE POLICY "song_catalog_update_admin" ON public.song_catalog FOR UPDATE TO authenticated USING (public.is_korero_admin()) WITH CHECK (public.is_korero_admin());
CREATE POLICY "song_catalog_delete_admin" ON public.song_catalog FOR DELETE TO authenticated USING (public.is_korero_admin());

-- Class sessions: admin writes
CREATE POLICY "class_sessions_insert_admin" ON public.class_sessions FOR INSERT TO authenticated WITH CHECK (public.is_korero_admin());
CREATE POLICY "class_sessions_update_admin" ON public.class_sessions FOR UPDATE TO authenticated USING (public.is_korero_admin()) WITH CHECK (public.is_korero_admin());
CREATE POLICY "class_sessions_delete_admin" ON public.class_sessions FOR DELETE TO authenticated USING (public.is_korero_admin());

-- Credit ledger: insert own rows
CREATE POLICY "credit_transactions_insert_own" ON public.credit_transactions FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Student notifications: admin can insert (e.g. validation complete)
CREATE POLICY "student_notifications_insert_admin" ON public.student_notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_korero_admin());

-- Students can raise a song-validation alert for a group they created (admin sees it in dashboard)
CREATE POLICY "admin_alerts_insert_creator_validation" ON public.admin_alerts FOR INSERT TO authenticated
  WITH CHECK (
    kind = 'song_validation'::public.admin_alert_kind
    AND EXISTS (
      SELECT 1
      FROM public.song_groups g
      WHERE g.id = group_id
        AND g.creator_id = auth.uid()
    )
  );
