-- ============================================================================
-- SUPABASE: Fix award_points RPC + verify (run entire script in SQL Editor)
--
-- What this does:
--   • 200 points/day cap (matches the app)
--   • NO weekly 500 cap (points can grow past 500 weekly/total)
--   • Removes old helper functions that enforced game/weekly limits
--
-- Note: The 6-activity daily plan (2 quiz, 2 games, durood, zikr,
--       hadith, salah) is enforced by the Vercel app, not this RPC.
-- ============================================================================

-- ── STEP 0: Before (optional preview) ─────────────────────────────────────
SELECT
  'BEFORE' AS stage,
  proname AS function_name,
  CASE
    WHEN pg_get_functiondef(oid) ILIKE '%v_weekly_limit%' THEN 'HAS weekly cap (needs fix)'
    WHEN pg_get_functiondef(oid) ILIKE '%v_daily_limit := 200%' THEN 'Daily 200 OK'
    WHEN pg_get_functiondef(oid) ILIKE '%v_daily_limit := 100%' THEN 'Daily 100 (old — needs fix)'
    ELSE 'Check function body manually'
  END AS status
FROM pg_proc
WHERE proname = 'award_points'
  AND pronamespace = 'public'::regnamespace;

-- ── STEP 1: Drop old / conflicting functions ───────────────────────────────
DROP FUNCTION IF EXISTS public.award_points(integer);
DROP FUNCTION IF EXISTS public.add_points(uuid, integer);
DROP FUNCTION IF EXISTS public.add_points_with_limits(uuid, integer);
DROP FUNCTION IF EXISTS public.check_daily_games_limit(uuid);

-- ── STEP 2: Create award_points (200/day, no weekly cap) ───────────────────
CREATE OR REPLACE FUNCTION public.award_points(p_points integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $award_points$
DECLARE
  v_uid UUID;
  v_daily_limit INTEGER := 200;
  v_today_points INTEGER;
  v_total_points INTEGER;
  v_weekly_points INTEGER;
  v_monthly_points INTEGER;
  v_last_earned_date DATE;
  v_today_date DATE;
  v_new_today_points INTEGER;
  v_points_to_award INTEGER;
BEGIN
  v_uid := auth.uid();
  v_today_date := CURRENT_DATE;

  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT
    today_points,
    total_points,
    weekly_points,
    monthly_points,
    last_earned_date
  INTO
    v_today_points,
    v_total_points,
    v_weekly_points,
    v_monthly_points,
    v_last_earned_date
  FROM public.users_points
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    v_today_points := 0;
    v_total_points := 0;
    v_weekly_points := 0;
    v_monthly_points := 0;
    v_last_earned_date := v_today_date;

    INSERT INTO public.users_points (
      user_id,
      total_points,
      today_points,
      weekly_points,
      monthly_points,
      last_earned_date
    )
    VALUES (v_uid, 0, 0, 0, 0, v_today_date);
  END IF;

  IF v_last_earned_date < v_today_date THEN
    v_today_points := 0;
  END IF;

  IF v_today_points >= v_daily_limit THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Daily limit of 200 points reached',
      'today_points', v_today_points,
      'daily_limit', v_daily_limit,
      'points_awarded', 0,
      'total_points', v_total_points,
      'weekly_points', v_weekly_points,
      'monthly_points', v_monthly_points
    );
  END IF;

  v_points_to_award := GREATEST(0, LEAST(COALESCE(p_points, 0), v_daily_limit - v_today_points));

  IF v_points_to_award <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No points can be awarded right now',
      'today_points', v_today_points,
      'daily_limit', v_daily_limit,
      'points_awarded', 0
    );
  END IF;

  v_new_today_points := v_today_points + v_points_to_award;

  UPDATE public.users_points
  SET
    today_points = v_new_today_points,
    total_points = COALESCE(v_total_points, 0) + v_points_to_award,
    weekly_points = COALESCE(v_weekly_points, 0) + v_points_to_award,
    monthly_points = COALESCE(v_monthly_points, 0) + v_points_to_award,
    last_earned_date = v_today_date,
    updated_at = NOW()
  WHERE user_id = v_uid;

  UPDATE public.users
  SET
    points = COALESCE(points, 0) + v_points_to_award,
    weeklypoints = COALESCE(weeklypoints, 0) + v_points_to_award,
    monthlypoints = COALESCE(monthlypoints, 0) + v_points_to_award,
    updatedat = NOW()
  WHERE uid = v_uid;

  RETURN json_build_object(
    'success', true,
    'points_awarded', v_points_to_award,
    'total_points', COALESCE(v_total_points, 0) + v_points_to_award,
    'today_points', v_new_today_points,
    'weekly_points', COALESCE(v_weekly_points, 0) + v_points_to_award,
    'monthly_points', COALESCE(v_monthly_points, 0) + v_points_to_award,
    'daily_limit', v_daily_limit
  );
END;
$award_points$;

GRANT EXECUTE ON FUNCTION public.award_points(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_points(integer) TO service_role;

-- ── STEP 3: After — verify success ─────────────────────────────────────────
SELECT
  'AFTER' AS stage,
  proname AS function_name,
  CASE
    WHEN pg_get_functiondef(oid) ILIKE '%v_weekly_limit%' THEN 'FAIL — still has weekly cap'
    WHEN pg_get_functiondef(oid) ILIKE '%v_daily_limit := 200%'
     AND pg_get_functiondef(oid) NOT ILIKE '%v_weekly_limit%' THEN 'OK — daily 200, no weekly cap'
    ELSE 'WARN — review function body below'
  END AS verification
FROM pg_proc
WHERE proname = 'award_points'
  AND pronamespace = 'public'::regnamespace;

-- Should return exactly 1 row with verification = 'OK — daily 200, no weekly cap'

-- Optional: confirm old limit helpers are gone
SELECT
  proname AS removed_should_be_empty
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('check_daily_games_limit', 'add_points_with_limits');

-- Optional: users currently stuck at weekly 500 (for manual review)
SELECT
  up.user_id,
  u.email,
  up.weekly_points,
  up.total_points,
  up.today_points,
  up.last_earned_date
FROM public.users_points up
LEFT JOIN public.users u ON u.uid = up.user_id
WHERE up.weekly_points >= 500
ORDER BY up.weekly_points DESC
LIMIT 20;
