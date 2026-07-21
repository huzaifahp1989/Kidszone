-- ============================================================================
-- UPDATE AWARD_POINTS RPC TO REMOVE 3-GAME LIMIT
-- ============================================================================

-- Drop existing functions to ensure clean slate
DROP FUNCTION IF EXISTS public.award_points(integer);
DROP FUNCTION IF EXISTS public.add_points(uuid, integer);
DROP FUNCTION IF EXISTS public.add_points_with_limits(uuid, integer);
DROP FUNCTION IF EXISTS public.check_daily_games_limit(uuid);

-- Recreate award_points with ONLY 100 points daily limit
CREATE OR REPLACE FUNCTION public.award_points(p_points integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID;
  v_daily_limit INTEGER := 100;
  v_weekly_limit INTEGER := 500;
  v_current_points INTEGER;
  v_today_points INTEGER;
  v_total_points INTEGER;
  v_weekly_points INTEGER;
  v_monthly_points INTEGER;
  v_last_earned_date DATE;
  v_today_date DATE;
  v_new_today_points INTEGER;
  v_points_to_award INTEGER;
BEGIN
  -- Get current user ID
  v_uid := auth.uid();
  v_today_date := CURRENT_DATE;
  
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get current stats from users_points table (or create if missing)
  SELECT 
    today_points, total_points, weekly_points, monthly_points, last_earned_date
  INTO 
    v_today_points, v_total_points, v_weekly_points, v_monthly_points, v_last_earned_date
  FROM public.users_points
  WHERE user_id = v_uid;

  -- Initialize if no record
  IF NOT FOUND THEN
    v_today_points := 0;
    v_total_points := 0;
    v_weekly_points := 0;
    v_monthly_points := 0;
    v_last_earned_date := v_today_date;
    
    INSERT INTO public.users_points (user_id, total_points, today_points, weekly_points, monthly_points, last_earned_date)
    VALUES (v_uid, 0, 0, 0, 0, v_today_date);
  END IF;

  -- Reset daily points if new day
  IF v_last_earned_date < v_today_date THEN
    v_today_points := 0;
  END IF;

  -- Calculate how many points can be awarded
  IF v_today_points >= v_daily_limit THEN
    RETURN json_build_object(
      'success', false, 
      'message', 'Daily limit of 100 points reached',
      'today_points', v_today_points,
      'daily_limit', v_daily_limit
    );
  END IF;

  v_points_to_award := GREATEST(
    0,
    LEAST(
      p_points,
      v_daily_limit - v_today_points,
      v_weekly_limit - LEAST(COALESCE(v_weekly_points, 0), v_weekly_limit)
    )
  );

  IF v_points_to_award <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Weekly limit of 500 points reached',
      'weekly_points', LEAST(COALESCE(v_weekly_points, 0), v_weekly_limit),
      'weekly_limit', v_weekly_limit
    );
  END IF;

  v_new_today_points := v_today_points + v_points_to_award;

  -- Update users_points
  UPDATE public.users_points
  SET 
    today_points = v_new_today_points,
    total_points = v_total_points + v_points_to_award,
    weekly_points = LEAST(v_weekly_limit, LEAST(COALESCE(v_weekly_points, 0), v_weekly_limit) + v_points_to_award),
    monthly_points = v_monthly_points + v_points_to_award,
    last_earned_date = v_today_date,
    updated_at = NOW()
  WHERE user_id = v_uid;

  -- Sync to users table for backward compatibility
  UPDATE public.users
  SET
    points = COALESCE(points, 0) + v_points_to_award,
    weeklypoints = LEAST(v_weekly_limit, LEAST(COALESCE(weeklypoints, 0), v_weekly_limit) + v_points_to_award),
    monthlypoints = COALESCE(monthlypoints, 0) + v_points_to_award,
    updatedat = NOW()
  WHERE uid = v_uid;

  RETURN json_build_object(
    'success', true,
    'points_awarded', v_points_to_award,
    'total_points', v_total_points + v_points_to_award,
    'today_points', v_new_today_points,
    'weekly_points', LEAST(v_weekly_limit, LEAST(COALESCE(v_weekly_points, 0), v_weekly_limit) + v_points_to_award),
    'weekly_limit', v_weekly_limit,
    'monthly_points', v_monthly_points + v_points_to_award,
    'daily_limit', v_daily_limit
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.award_points(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_points(integer) TO service_role;
