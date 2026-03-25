-- Fix enrollment headcount trigger after groups->classes rename.
-- The old trigger function still referenced NEW/OLD.group_id.

CREATE OR REPLACE FUNCTION public.recalc_group_headcount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  cnt int;
BEGIN
  cid := COALESCE(NEW.class_id, OLD.class_id);

  IF cid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*)::int INTO cnt
  FROM public.class_enrollments
  WHERE class_id = cid;

  UPDATE public.classes
  SET
    interest_count = cnt,
    status = CASE
      WHEN max_members > 0 AND cnt >= max_members THEN 'confirmed'::public.group_status
      ELSE 'forming'::public.group_status
    END
  WHERE id = cid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS group_enrollment_changed ON public.class_enrollments;
CREATE TRIGGER group_enrollment_changed
  AFTER INSERT OR DELETE ON public.class_enrollments
  FOR EACH ROW
  EXECUTE PROCEDURE public.recalc_group_headcount();

