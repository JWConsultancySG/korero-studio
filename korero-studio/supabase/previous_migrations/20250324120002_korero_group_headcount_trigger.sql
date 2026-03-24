-- Recalculate song_groups.interest_count and status from enrollments (SECURITY DEFINER bypasses RLS on update).

CREATE OR REPLACE FUNCTION public.recalc_group_headcount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gid uuid;
  cnt int;
BEGIN
  gid := COALESCE(NEW.group_id, OLD.group_id);

  SELECT COUNT(*)::int INTO cnt FROM public.group_enrollments WHERE group_id = gid;

  UPDATE public.song_groups
  SET
    interest_count = cnt,
    status = CASE
      WHEN max_members > 0 AND cnt >= max_members THEN 'confirmed'::public.group_status
      ELSE 'forming'::public.group_status
    END
  WHERE id = gid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER group_enrollment_changed
  AFTER INSERT OR DELETE ON public.group_enrollments
  FOR EACH ROW
  EXECUTE PROCEDURE public.recalc_group_headcount();
