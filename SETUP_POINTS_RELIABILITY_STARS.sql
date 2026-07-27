-- Points reliability, monthly history snapshots, stars, quarterly draw support
-- Run in Supabase SQL Editor (or apply as migration)

-- 1) Extend user_monthly_progress
CREATE TABLE IF NOT EXISTS public.user_monthly_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month_start DATE NOT NULL,
  -- to_char() is not IMMUTABLE (locale-dependent); use extract for generated columns
  month_key TEXT GENERATED ALWAYS AS (
    (EXTRACT(YEAR FROM month_start)::INT)::TEXT || '-' ||
    LPAD((EXTRACT(MONTH FROM month_start)::INT)::TEXT, 2, '0')
  ) STORED,
  quiz_attempts INT NOT NULL DEFAULT 0,
  points_from_quiz INT NOT NULL DEFAULT 0,
  pledge_logs INT NOT NULL DEFAULT 0,
  pledge_recitations INT NOT NULL DEFAULT 0,
  game_sessions INT NOT NULL DEFAULT 0,
  points_from_games INT NOT NULL DEFAULT 0,
  total_activities INT NOT NULL DEFAULT 0,
  total_points INT NOT NULL DEFAULT 0,
  certificate_qualified BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_monthly_progress_user_month_unique UNIQUE (user_id, month_start)
);

ALTER TABLE public.user_monthly_progress
  ADD COLUMN IF NOT EXISTS leaderboard_monthly_points INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS star_earned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS star_awarded_at TIMESTAMPTZ;

UPDATE public.user_monthly_progress
SET leaderboard_monthly_points = total_points
WHERE leaderboard_monthly_points = 0 AND total_points > 0;

-- 2) Stars rollup on users_points
ALTER TABLE public.users_points
  ADD COLUMN IF NOT EXISTS stars_this_quarter INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quarter_key TEXT;

-- 3) Prize win records (frozen points at win time)
CREATE TABLE IF NOT EXISTS public.prize_win_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly')),
  period_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  points_at_win INT NOT NULL DEFAULT 0,
  weekly_points_at_win INT NOT NULL DEFAULT 0,
  monthly_points_at_win INT NOT NULL DEFAULT 0,
  stars_at_win INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_prize_win_records_user
  ON public.prize_win_records(user_id);

CREATE INDEX IF NOT EXISTS idx_prize_win_records_period
  ON public.prize_win_records(period_type, period_key DESC);

ALTER TABLE public.prize_win_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prize_win_records'
      AND policyname = 'Users can view own prize wins'
  ) THEN
    CREATE POLICY "Users can view own prize wins"
      ON public.prize_win_records
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4) Points repair run log
CREATE TABLE IF NOT EXISTS public.points_repair_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  trigger_source TEXT NOT NULL DEFAULT 'cron',
  users_scanned INT NOT NULL DEFAULT 0,
  users_fixed INT NOT NULL DEFAULT 0,
  mirror_fixed INT NOT NULL DEFAULT 0,
  errors INT NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 5) Atomic capped award RPC (optional; TS fallback remains)
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
  v_today_key TEXT := to_char((NOW() AT TIME ZONE 'utc'), 'YYYY-MM-DD');
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

  SELECT * INTO v_row FROM public.users_points WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.users_points (user_id, total_points, weekly_points, monthly_points, today_points, last_earned_date, badges, level)
    VALUES (p_user_id, 0, 0, 0, 0, NULL, 0, 1)
    RETURNING * INTO v_row;
  END IF;

  v_base_total := COALESCE(v_row.total_points, 0);
  v_base_weekly := COALESCE(v_row.weekly_points, 0);
  v_base_monthly := COALESCE(v_row.monthly_points, 0);
  IF v_row.last_earned_date IS NULL OR to_char(v_row.last_earned_date::date, 'YYYY-MM') <> v_month THEN
    v_base_monthly := 0;
  END IF;

  IF v_row.last_earned_date IS NULL OR v_row.last_earned_date::text <> v_today_key THEN
    v_current_today := 0;
  ELSE
    v_current_today := COALESCE(v_row.today_points, 0);
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
  v_new_today := CASE WHEN p_count_toward_daily THEN v_current_today + v_award ELSE v_current_today END;
  v_badges := FLOOR(v_total / 100.0)::INT;
  v_level := 1 + FLOOR(v_badges / 5.0)::INT;

  UPDATE public.users_points
  SET
    total_points = v_total,
    weekly_points = v_weekly,
    monthly_points = v_monthly,
    today_points = v_new_today,
    last_earned_date = v_today_key::date,
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
