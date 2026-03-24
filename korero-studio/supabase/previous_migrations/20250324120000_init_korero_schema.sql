-- Korero Studio — initial schema (replaces localStorage / client mock state).
-- Run via Supabase CLI: `supabase db push` or apply in SQL Editor.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Enums (align with korero-studio/types/index.ts)
-- ---------------------------------------------------------------------------
CREATE TYPE public.class_type AS ENUM ('no-filming', 'half-song', 'full-song');

CREATE TYPE public.group_status AS ENUM ('forming', 'confirmed', 'pending');

CREATE TYPE public.studio_room AS ENUM ('Farrer Park', 'Orchard');

CREATE TYPE public.role_name AS ENUM (
  'Main Vocal',
  'Sub Vocal',
  'Main Dancer',
  'Sub Dancer',
  'Rapper',
  'Center'
);

CREATE TYPE public.booking_payment_status AS ENUM ('pending', 'paid');

CREATE TYPE public.credit_transaction_kind AS ENUM (
  'top_up',
  'group_create',
  'adjustment',
  'class_plan'
);

CREATE TYPE public.admin_alert_kind AS ENUM ('song_validation');

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users; student-facing fields + credits)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  class_preference public.class_type,
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'App student profile; id matches auth.users.id.';

-- ---------------------------------------------------------------------------
-- Song library (validated catalog entries, keyed by song_key)
-- ---------------------------------------------------------------------------
CREATE TABLE public.song_catalog (
  song_key text PRIMARY KEY,
  song_title text NOT NULL,
  artist text NOT NULL,
  image_url text,
  itunes_track_id bigint,
  validated boolean NOT NULL DEFAULT false,
  formation_size integer NOT NULL CHECK (formation_size > 0),
  role_names text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL DEFAULT '',
  class_type_options public.class_type[] NOT NULL DEFAULT ARRAY[]::public.class_type[],
  teacher_notes text NOT NULL DEFAULT '',
  validated_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Song groups / class listings
-- ---------------------------------------------------------------------------
CREATE TABLE public.song_groups (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  song_title text NOT NULL,
  artist text NOT NULL,
  song_key text REFERENCES public.song_catalog (song_key) ON DELETE SET NULL,
  interest_count integer NOT NULL DEFAULT 0 CHECK (interest_count >= 0),
  status public.group_status NOT NULL DEFAULT 'forming',
  max_members integer NOT NULL CHECK (max_members > 0),
  image_url text,
  slot_labels text[] NOT NULL DEFAULT '{}',
  creator_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  creator_slot_label text,
  credits_charged integer,
  class_type_at_creation public.class_type,
  itunes_track_id bigint,
  awaiting_song_validation boolean NOT NULL DEFAULT false,
  full_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_song_groups_song_key ON public.song_groups (song_key);
CREATE INDEX idx_song_groups_status ON public.song_groups (status);
CREATE INDEX idx_song_groups_creator_id ON public.song_groups (creator_id);

-- ---------------------------------------------------------------------------
-- Group membership + availability snapshots (JSON matches AvailabilitySlot[])
-- ---------------------------------------------------------------------------
CREATE TABLE public.group_enrollments (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.song_groups (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  student_name text NOT NULL,
  slot_label text NOT NULL,
  availability_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, student_id)
);

CREATE INDEX idx_group_enrollments_group_id ON public.group_enrollments (group_id);
CREATE INDEX idx_group_enrollments_student_id ON public.group_enrollments (student_id);

-- ---------------------------------------------------------------------------
-- Student “My Schedule” availability (replaces in-memory availability state)
-- ---------------------------------------------------------------------------
CREATE TABLE public.student_availability_slots (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  date date NOT NULL,
  start_hour integer NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour integer NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),
  is_confirmed_class boolean NOT NULL DEFAULT false,
  confirmed_group_id uuid REFERENCES public.song_groups (id) ON DELETE SET NULL
);

CREATE INDEX idx_student_availability_student_date ON public.student_availability_slots (student_id, date);

-- ---------------------------------------------------------------------------
-- Bookings (booking flow; time_slot stored as JSON for TimeSlot object)
-- ---------------------------------------------------------------------------
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.song_groups (id) ON DELETE CASCADE,
  role public.role_name NOT NULL,
  time_slot jsonb NOT NULL,
  payment_status public.booking_payment_status NOT NULL DEFAULT 'pending',
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_student_id ON public.bookings (student_id);
CREATE INDEX idx_bookings_group_id ON public.bookings (group_id);

-- ---------------------------------------------------------------------------
-- Scheduled class sessions (admin timetable)
-- ---------------------------------------------------------------------------
CREATE TABLE public.class_sessions (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.song_groups (id) ON DELETE CASCADE,
  room public.studio_room NOT NULL,
  day text NOT NULL,
  time text NOT NULL,
  confirmed boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_class_sessions_group_id ON public.class_sessions (group_id);
CREATE INDEX idx_class_sessions_room ON public.class_sessions (room);

-- ---------------------------------------------------------------------------
-- Credit ledger
-- ---------------------------------------------------------------------------
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  kind public.credit_transaction_kind NOT NULL,
  credits_delta integer NOT NULL,
  sgd_delta numeric(12, 2),
  label text NOT NULL,
  group_id uuid REFERENCES public.song_groups (id) ON DELETE SET NULL,
  class_type public.class_type,
  payment_ref text
);

CREATE INDEX idx_credit_transactions_profile_id ON public.credit_transactions (profile_id);
CREATE INDEX idx_credit_transactions_at ON public.credit_transactions (at DESC);

-- ---------------------------------------------------------------------------
-- Admin alerts (e.g. song validation)
-- ---------------------------------------------------------------------------
CREATE TABLE public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  kind public.admin_alert_kind NOT NULL,
  message text NOT NULL,
  group_id uuid NOT NULL REFERENCES public.song_groups (id) ON DELETE CASCADE,
  song_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz
);

CREATE INDEX idx_admin_alerts_group_id ON public.admin_alerts (group_id);

-- ---------------------------------------------------------------------------
-- In-app student notifications
-- ---------------------------------------------------------------------------
CREATE TABLE public.student_notifications (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_notifications_student_id ON public.student_notifications (student_id);

-- ---------------------------------------------------------------------------
-- Draft slot holds (group creation wizard; short TTL)
-- ---------------------------------------------------------------------------
CREATE TABLE public.draft_slot_holds (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  draft_id text NOT NULL,
  slot_label text NOT NULL,
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  student_name text NOT NULL,
  expires_at timestamptz NOT NULL,
  UNIQUE (draft_id, slot_label)
);

CREATE INDEX idx_draft_slot_holds_expires_at ON public.draft_slot_holds (expires_at);

-- ---------------------------------------------------------------------------
-- Booking UI time slots (replaces MOCK_TIME_SLOTS in AppContext)
-- ---------------------------------------------------------------------------
CREATE TABLE public.booking_time_slot_templates (
  id text PRIMARY KEY,
  day text NOT NULL,
  time text NOT NULL,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO public.booking_time_slot_templates (id, day, time, available, sort_order)
VALUES
  ('t1', 'Monday', '6:00 PM', true, 1),
  ('t2', 'Monday', '7:30 PM', true, 2),
  ('t3', 'Tuesday', '6:00 PM', true, 3),
  ('t4', 'Wednesday', '7:00 PM', true, 4),
  ('t5', 'Thursday', '6:00 PM', false, 5),
  ('t6', 'Friday', '7:00 PM', true, 6),
  ('t7', 'Saturday', '10:00 AM', true, 7),
  ('t8', 'Saturday', '2:00 PM', true, 8),
  ('t9', 'Sunday', '11:00 AM', true, 9);

-- ---------------------------------------------------------------------------
-- Server action: notifyClassThresholdReached, sendManualWhatsAppMessage
-- ---------------------------------------------------------------------------
CREATE TABLE public.korero_notification_log (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  kind text NOT NULL,
  payload jsonb,
  to_phone text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_korero_notification_log_created_at ON public.korero_notification_log (created_at DESC);

COMMENT ON TABLE public.korero_notification_log IS 'Used by app/actions/notifications.ts (service role).';

-- ---------------------------------------------------------------------------
-- Server action: submitPostPaymentFollowUp
-- ---------------------------------------------------------------------------
CREATE TABLE public.korero_followups (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  student_email text,
  student_phone text NOT NULL,
  experience_level text NOT NULL,
  note text,
  payment_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_korero_followups_student_id ON public.korero_followups (student_id);

COMMENT ON TABLE public.korero_followups IS 'Post-payment follow-up; aligns with submitPostPaymentFollowUp.';

-- ---------------------------------------------------------------------------
-- Auth: create profile row when a user signs up
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    COALESCE(new.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  new.updated_at := now();
  RETURN new;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER song_groups_set_updated_at
  BEFORE UPDATE ON public.song_groups
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_slot_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_time_slot_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korero_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korero_followups ENABLE ROW LEVEL SECURITY;

-- Profiles: own row only
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Song catalog: readable by any signed-in user (browse library)
CREATE POLICY "song_catalog_select_authenticated" ON public.song_catalog FOR SELECT TO authenticated USING (true);

-- Song groups: readable when listed in app; hide unvalidated from non-admins in app layer, or add is_admin claim later
CREATE POLICY "song_groups_select_authenticated" ON public.song_groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "song_groups_insert_authenticated" ON public.song_groups FOR INSERT TO authenticated
  WITH CHECK (creator_id IS NULL OR creator_id = auth.uid());

CREATE POLICY "song_groups_update_creator" ON public.song_groups FOR UPDATE TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- Enrollments: own row, or any row for a group the user is enrolled in (overlap / matcher UI)
CREATE POLICY "group_enrollments_select_member_or_peer" ON public.group_enrollments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.group_enrollments ge2
      WHERE ge2.group_id = group_id
        AND ge2.student_id = auth.uid()
    )
  );

CREATE POLICY "group_enrollments_insert_own" ON public.group_enrollments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "group_enrollments_update_own" ON public.group_enrollments FOR UPDATE TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Student availability: own rows only
CREATE POLICY "student_availability_select_own" ON public.student_availability_slots FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "student_availability_insert_own" ON public.student_availability_slots FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "student_availability_update_own" ON public.student_availability_slots FOR UPDATE TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "student_availability_delete_own" ON public.student_availability_slots FOR DELETE TO authenticated
  USING (student_id = auth.uid());

-- Bookings: own
CREATE POLICY "bookings_select_own" ON public.bookings FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "bookings_insert_own" ON public.bookings FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "bookings_update_own" ON public.bookings FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Class sessions: visible to authenticated (timetable); tighten to group members if needed
CREATE POLICY "class_sessions_select_authenticated" ON public.class_sessions FOR SELECT TO authenticated USING (true);

-- Credit transactions: own ledger
CREATE POLICY "credit_transactions_select_own" ON public.credit_transactions FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- Admin alerts: typically service-role only; allow read for debugging or remove for production
CREATE POLICY "admin_alerts_select_authenticated" ON public.admin_alerts FOR SELECT TO authenticated USING (true);

-- Student notifications: own
CREATE POLICY "student_notifications_select_own" ON public.student_notifications FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "student_notifications_update_own" ON public.student_notifications FOR UPDATE TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Draft holds: own student
CREATE POLICY "draft_slot_holds_select_own" ON public.draft_slot_holds FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "draft_slot_holds_insert_own" ON public.draft_slot_holds FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "draft_slot_holds_update_own" ON public.draft_slot_holds FOR UPDATE TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "draft_slot_holds_delete_own" ON public.draft_slot_holds FOR DELETE TO authenticated
  USING (student_id = auth.uid());

-- Booking slot templates: read-only reference data
CREATE POLICY "booking_time_slot_templates_select_authenticated" ON public.booking_time_slot_templates FOR SELECT TO authenticated USING (true);

-- Service / server writes use service_role key (bypasses RLS). Lock down direct client access:
CREATE POLICY "korero_notification_log_deny_all" ON public.korero_notification_log FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "korero_followups_select_own" ON public.korero_followups FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Inserts to korero_followups from server action use service role; no insert policy for authenticated.
