-- Golden slots flow: instructor slot selection, student payment tracking, slot locking

-- New transitional matching state between golden and fixed
ALTER TYPE public.matching_state ADD VALUE IF NOT EXISTS 'instructor_confirmed' BEFORE 'fixed';

-- Instructor's curated subset of finalized_slot_blocks
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS selected_lesson_slots jsonb DEFAULT '[]'::jsonb;

-- Per-student payment tracking: { "student-uuid": "pending"|"paid" }
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS student_payments jsonb DEFAULT '{}'::jsonb;

-- Cancellation tracking
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Locking columns on instructor_availability_slots
ALTER TABLE public.instructor_availability_slots
  ADD COLUMN IF NOT EXISTS is_confirmed_class boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

-- Locking columns on studio_availability_slots
ALTER TABLE public.studio_availability_slots
  ADD COLUMN IF NOT EXISTS is_confirmed_class boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

-- Indexes for efficient lookup during cancellation / slot release
CREATE INDEX IF NOT EXISTS idx_instructor_avail_confirmed_class
  ON public.instructor_availability_slots (confirmed_class_id)
  WHERE confirmed_class_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_studio_avail_confirmed_class
  ON public.studio_availability_slots (confirmed_class_id)
  WHERE confirmed_class_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_avail_confirmed_class
  ON public.student_availability_slots (confirmed_class_id)
  WHERE confirmed_class_id IS NOT NULL;
