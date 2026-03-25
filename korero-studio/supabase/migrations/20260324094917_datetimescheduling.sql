-- Date-time based scheduling for class sessions.
-- Keep legacy weekday fields for transitional read compatibility.

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz;

-- Backfill existing rows from legacy day/time fields to the next upcoming occurrence.
WITH day_map AS (
  SELECT
    id,
    CASE lower(trim(day))
      WHEN 'monday' THEN 1
      WHEN 'tuesday' THEN 2
      WHEN 'wednesday' THEN 3
      WHEN 'thursday' THEN 4
      WHEN 'friday' THEN 5
      WHEN 'saturday' THEN 6
      WHEN 'sunday' THEN 0
      ELSE NULL
    END AS target_dow,
    time
  FROM public.class_sessions
),
base AS (
  SELECT
    dm.id,
    dm.target_dow,
    (date_trunc('day', now())::date + ((dm.target_dow - extract(dow from now())::int + 7) % 7))::date AS target_date,
    dm.time
  FROM day_map dm
  WHERE dm.target_dow IS NOT NULL
),
parsed AS (
  SELECT
    b.id,
    (b.target_date::text || ' ' || b.time) AS date_time_text
  FROM base b
)
UPDATE public.class_sessions cs
SET
  start_at = COALESCE(
    cs.start_at,
    to_timestamp(p.date_time_text, 'YYYY-MM-DD FMHH12:MI AM')
  ),
  end_at = COALESCE(
    cs.end_at,
    to_timestamp(p.date_time_text, 'YYYY-MM-DD FMHH12:MI AM') + interval '1 hour'
  )
FROM parsed p
WHERE cs.id = p.id
  AND (cs.start_at IS NULL OR cs.end_at IS NULL);

ALTER TABLE public.class_sessions
  ADD CONSTRAINT class_sessions_time_order_chk
  CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at);

-- One room cannot have overlapping one-hour slot starts.
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_sessions_room_start_at_unique
  ON public.class_sessions (room, start_at)
  WHERE start_at IS NOT NULL;

-- A group should not be double-booked at the same start time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_sessions_group_start_at_unique
  ON public.class_sessions (group_id, start_at)
  WHERE start_at IS NOT NULL;
