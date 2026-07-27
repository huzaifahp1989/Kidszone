-- Keep public.users mirror columns in sync whenever canonical users_points changes.
-- This guarantees points/weeklypoints/monthlypoints stay current for legacy readers.

CREATE OR REPLACE FUNCTION public.sync_users_points_to_users_mirror()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET
    points = COALESCE(NEW.total_points, 0),
    weeklypoints = COALESCE(NEW.weekly_points, 0),
    monthlypoints = COALESCE(NEW.monthly_points, 0)
  WHERE uid = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_users_points_to_users_mirror ON public.users_points;

CREATE TRIGGER trg_sync_users_points_to_users_mirror
AFTER INSERT OR UPDATE OF total_points, weekly_points, monthly_points
ON public.users_points
FOR EACH ROW
EXECUTE FUNCTION public.sync_users_points_to_users_mirror();

-- Backfill existing drift immediately.
UPDATE public.users AS u
SET
  points = COALESCE(up.total_points, 0),
  weeklypoints = COALESCE(up.weekly_points, 0),
  monthlypoints = COALESCE(up.monthly_points, 0)
FROM public.users_points AS up
WHERE u.uid = up.user_id
  AND (
    COALESCE(u.points, 0) <> COALESCE(up.total_points, 0)
    OR COALESCE(u.weeklypoints, 0) <> COALESCE(up.weekly_points, 0)
    OR COALESCE(u.monthlypoints, 0) <> COALESCE(up.monthly_points, 0)
  );
