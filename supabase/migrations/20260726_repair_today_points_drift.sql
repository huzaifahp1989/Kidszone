-- Repair stale today_points rows and harden the capped award RPC.
-- This keeps corrupted users_points.today_points values from blocking future awards.

CREATE OR REPLACE FUNCTION public.repair_today_points_drift(
  p_daily_cap INT DEFAULT 200
)
RETURNS TABLE (
  stale_rows_reset INT,
  active_rows_clamped INT,
  mirror_rows_synced INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'utc')::date;
BEGIN
  UPDATE public.users_points
  SET today_points = 0
  WHERE COALESCE(today_points, 0) <> 0
    AND (last_earned_date IS NULL OR last_earned_date <> v_today);
  GET DIAGNOSTICS stale_rows_reset = ROW_COUNT;

  UPDATE public.users_points
  SET today_points = LEAST(GREATEST(COALESCE(today_points, 0), 0), p_daily_cap)
  WHERE last_earned_date = v_today
    AND COALESCE(today_points, 0) <> LEAST(GREATEST(COALESCE(today_points, 0), 0), p_daily_cap);
  GET DIAGNOSTICS active_rows_clamped = ROW_COUNT;

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
  GET DIAGNOSTICS mirror_rows_synced = ROW_COUNT;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.repair_today_points_drift(INT) TO service_role;

CREATE OR REPLACE FUNCTION public.award_points_capped(
  p_user_id UUID,
  p_points INT,
  p_daily_cap INT DEFAULT 200,
  p_count_toward_daily BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  success BOOLEAN,
  reason TEXT,
  points_awarded INT,
  total_points INT,
  weekly_points INT,
  monthly_points INT,
  today_points INT,
  badges INT,
  level INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'utc')::date;
  v_month TEXT := to_char((NOW() AT TIME ZONE 'utc'), 'YYYY-MM');
  v_row public.users_points%ROWTYPE;
  v_base_total INT;
  v_base_weekly INT;
  v_base_monthly INT;
  v_current_today INT;
  v_award INT;
  v_total INT;
  v_weekly INT;
  v_monthly INT;
  v_new_today INT;
  v_badges INT;
  v_level INT;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    success := FALSE;
    reason := 'invalid_points';
    points_awarded := 0;
    total_points := 0;
    weekly_points := 0;
    monthly_points := 0;
    today_points := 0;
    badges := 0;
    level := 1;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.users_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.users_points (
      user_id,
      total_points,
      weekly_points,
      monthly_points,
      today_points,
      last_earned_date,
      badges,
      level
    )
    VALUES (p_user_id, 0, 0, 0, 0, NULL, 0, 1)
    RETURNING * INTO v_row;
  END IF;

  v_base_total := COALESCE(v_row.total_points, 0);
  v_base_weekly := COALESCE(v_row.weekly_points, 0);
  v_base_monthly := COALESCE(v_row.monthly_points, 0);

  IF v_row.last_earned_date IS NULL OR to_char(v_row.last_earned_date::date, 'YYYY-MM') <> v_month THEN
    v_base_monthly := 0;
  END IF;

  IF v_row.last_earned_date IS NULL OR v_row.last_earned_date <> v_today THEN
    v_current_today := 0;
  ELSE
    v_current_today := LEAST(GREATEST(COALESCE(v_row.today_points, 0), 0), p_daily_cap);
  END IF;

  IF COALESCE(v_row.today_points, 0) <> v_current_today THEN
    UPDATE public.users_points
    SET today_points = v_current_today
    WHERE user_id = p_user_id;
  END IF;

  IF p_count_toward_daily THEN
    v_award := GREATEST(0, LEAST(p_points, p_daily_cap - v_current_today));
  ELSE
    v_award := p_points;
  END IF;

  IF v_award <= 0 THEN
    success := TRUE;
    reason := 'daily_limit_reached';
    points_awarded := 0;
    total_points := v_base_total;
    weekly_points := v_base_weekly;
    monthly_points := v_base_monthly;
    today_points := v_current_today;
    badges := FLOOR(v_base_total / 100.0)::INT;
    level := 1 + FLOOR(FLOOR(v_base_total / 100.0) / 5.0)::INT;
    RETURN NEXT;
    RETURN;
  END IF;

  v_total := v_base_total + v_award;
  v_weekly := v_base_weekly + v_award;
  v_monthly := v_base_monthly + v_award;
  v_new_today := CASE
    WHEN p_count_toward_daily THEN LEAST(p_daily_cap, v_current_today + v_award)
    ELSE v_current_today
  END;
  v_badges := FLOOR(v_total / 100.0)::INT;
  v_level := 1 + FLOOR(v_badges / 5.0)::INT;

  UPDATE public.users_points
  SET
    total_points = v_total,
    weekly_points = v_weekly,
    monthly_points = v_monthly,
    today_points = v_new_today,
    last_earned_date = v_today,
    badges = v_badges,
    level = v_level
  WHERE user_id = p_user_id;

  UPDATE public.users
  SET
    points = v_total,
    weeklypoints = v_weekly,
    monthlypoints = v_monthly
  WHERE uid = p_user_id;

  success := TRUE;
  reason := 'awarded';
  points_awarded := v_award;
  total_points := v_total;
  weekly_points := v_weekly;
  monthly_points := v_monthly;
  today_points := v_new_today;
  badges := v_badges;
  level := v_level;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_points_capped(UUID, INT, INT, BOOLEAN) TO service_role;

SELECT * FROM public.repair_today_points_drift(200);
