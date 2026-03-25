-- Multi-party matching: studios + instructors + golden/fixed lifecycle

CREATE TYPE public.matching_state AS ENUM ('forming', 'matching', 'golden', 'fixed');
CREATE TYPE public.assignment_status AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE public.final_payment_status AS ENUM ('pending', 'paid');

CREATE TABLE public.studios (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  location text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'Asia/Singapore',
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.studio_availability_slots (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios (id) ON DELETE CASCADE,
  date date NOT NULL,
  start_hour integer NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour integer NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),
  CHECK (end_hour > start_hour)
);

CREATE INDEX idx_studio_availability_studio_date
  ON public.studio_availability_slots (studio_id, date);

CREATE TABLE public.instructor_availability_slots (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  date date NOT NULL,
  start_hour integer NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour integer NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),
  CHECK (end_hour > start_hour)
);

CREATE INDEX idx_instructor_availability_instructor_date
  ON public.instructor_availability_slots (instructor_id, date);

CREATE TABLE public.group_instructor_assignments (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.song_groups (id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.assignment_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  UNIQUE (group_id, instructor_id)
);

CREATE UNIQUE INDEX idx_group_instructor_single_confirmed
  ON public.group_instructor_assignments (group_id)
  WHERE status = 'confirmed';

CREATE TABLE public.group_studio_selection (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  group_id uuid NOT NULL UNIQUE REFERENCES public.song_groups (id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios (id) ON DELETE RESTRICT,
  selected_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  selected_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.song_groups
  ADD COLUMN IF NOT EXISTS matching_state public.matching_state NOT NULL DEFAULT 'forming',
  ADD COLUMN IF NOT EXISTS golden_at timestamptz,
  ADD COLUMN IF NOT EXISTS fixed_at timestamptz,
  ADD COLUMN IF NOT EXISTS required_match_hours integer NOT NULL DEFAULT 0 CHECK (required_match_hours >= 0),
  ADD COLUMN IF NOT EXISTS accepted_by_students jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS accepted_by_instructor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalized_slot_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS final_payment_status public.final_payment_status NOT NULL DEFAULT 'pending';

CREATE INDEX idx_song_groups_matching_state ON public.song_groups (matching_state);

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios (id) ON DELETE SET NULL;

CREATE INDEX idx_class_sessions_studio_id ON public.class_sessions (studio_id);

CREATE OR REPLACE FUNCTION public.set_song_group_required_hours()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.class_type_at_creation = 'no-filming' THEN
    NEW.required_match_hours := 4;
  ELSIF NEW.class_type_at_creation = 'half-song' THEN
    NEW.required_match_hours := 6;
  ELSIF NEW.class_type_at_creation = 'full-song' THEN
    NEW.required_match_hours := 8;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS song_groups_required_hours_trg ON public.song_groups;
CREATE TRIGGER song_groups_required_hours_trg
BEFORE INSERT OR UPDATE OF class_type_at_creation ON public.song_groups
FOR EACH ROW
EXECUTE PROCEDURE public.set_song_group_required_hours();

ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_instructor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_studio_selection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studios_select_authenticated" ON public.studios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "studio_availability_select_authenticated" ON public.studio_availability_slots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "instructor_availability_select_authenticated" ON public.instructor_availability_slots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "instructor_availability_insert_own" ON public.instructor_availability_slots
  FOR INSERT TO authenticated WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "instructor_availability_update_own" ON public.instructor_availability_slots
  FOR UPDATE TO authenticated USING (instructor_id = auth.uid()) WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "instructor_availability_delete_own" ON public.instructor_availability_slots
  FOR DELETE TO authenticated USING (instructor_id = auth.uid());

CREATE POLICY "group_instructor_select_authenticated" ON public.group_instructor_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "group_instructor_insert_own" ON public.group_instructor_assignments
  FOR INSERT TO authenticated WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "group_studio_selection_select_authenticated" ON public.group_studio_selection
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.studios (name, location, address, timezone, capacity, notes)
VALUES
  ('Farrer Park', 'Farrer Park', 'Farrer Park, Singapore', 'Asia/Singapore', 10, 'Main studio room'),
  ('Orchard', 'Orchard', 'Orchard, Singapore', 'Asia/Singapore', 10, 'Secondary studio room')
ON CONFLICT (name) DO NOTHING;
