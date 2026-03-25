-- Rename group domain to class domain

ALTER TABLE IF EXISTS public.song_groups RENAME TO classes;
ALTER TABLE IF EXISTS public.group_enrollments RENAME TO class_enrollments;
ALTER TABLE IF EXISTS public.group_studio_selection RENAME TO class_studio_selection;
ALTER TABLE IF EXISTS public.group_instructor_assignments RENAME TO class_instructor_assignments;

ALTER TABLE IF EXISTS public.bookings RENAME COLUMN group_id TO class_id;
ALTER TABLE IF EXISTS public.class_sessions RENAME COLUMN group_id TO class_id;
ALTER TABLE IF EXISTS public.credit_transactions RENAME COLUMN group_id TO class_id;
ALTER TABLE IF EXISTS public.admin_alerts RENAME COLUMN group_id TO class_id;
ALTER TABLE IF EXISTS public.student_availability_slots RENAME COLUMN confirmed_group_id TO confirmed_class_id;
ALTER TABLE IF EXISTS public.korero_notification_log RENAME COLUMN payload TO payload_json;

ALTER TABLE IF EXISTS public.class_enrollments RENAME COLUMN group_id TO class_id;
ALTER TABLE IF EXISTS public.class_studio_selection RENAME COLUMN group_id TO class_id;
ALTER TABLE IF EXISTS public.class_instructor_assignments RENAME COLUMN group_id TO class_id;

-- Keep old function names but update internals for compatibility
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

DROP TRIGGER IF EXISTS song_groups_required_hours_trg ON public.classes;
CREATE TRIGGER song_groups_required_hours_trg
BEFORE INSERT OR UPDATE OF class_type_at_creation ON public.classes
FOR EACH ROW
EXECUTE PROCEDURE public.set_song_group_required_hours();
