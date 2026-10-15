-- Server-validated, once-per-day learning rewards for the Virtual Hajj MVP.
-- Depends on public.award_points_capped(UUID, INT, INT, BOOLEAN).

CREATE TABLE IF NOT EXISTS public.virtual_hajj_challenge_attempts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  attempts_used INT NOT NULL DEFAULT 0 CHECK (attempts_used >= 0 AND attempts_used <= 5),
  PRIMARY KEY (user_id, challenge_date)
);

CREATE TABLE IF NOT EXISTS public.virtual_hajj_challenge_claims (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_key TEXT NOT NULL,
  points_awarded INT NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, challenge_key)
);

CREATE TABLE IF NOT EXISTS public.virtual_hajj_level_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id TEXT NOT NULL CHECK (level_id IN ('tawaf-learning', 'safa-marwah-learning')),
  unlocked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, level_id)
);

CREATE TABLE IF NOT EXISTS public.virtual_hajj_achievements (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL CHECK (achievement_id IN ('tawaf-learner')),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.virtual_hajj_challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_hajj_challenge_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_hajj_level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_hajj_achievements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.virtual_hajj_challenge_attempts FROM anon, authenticated;
REVOKE ALL ON public.virtual_hajj_challenge_claims FROM anon, authenticated;
REVOKE ALL ON public.virtual_hajj_level_progress FROM anon, authenticated;
REVOKE ALL ON public.virtual_hajj_achievements FROM anon, authenticated;
GRANT ALL ON public.virtual_hajj_challenge_attempts TO service_role;
GRANT ALL ON public.virtual_hajj_challenge_claims TO service_role;
GRANT ALL ON public.virtual_hajj_level_progress TO service_role;
GRANT ALL ON public.virtual_hajj_achievements TO service_role;

CREATE OR REPLACE FUNCTION public.submit_virtual_hajj_challenge(
  p_user_id UUID,
  p_challenge_key TEXT,
  p_is_correct BOOLEAN,
  p_points INT
)
RETURNS TABLE (
  success BOOLEAN,
  correct BOOLEAN,
  already_completed BOOLEAN,
  attempts_used INT,
  attempts_remaining INT,
  points_awarded INT,
  total_points INT,
  weekly_points INT,
  monthly_points INT,
  today_points INT,
  daily_limit INT,
  next_level_unlocked BOOLEAN,
  achievement_unlocked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'utc')::date;
  v_used INT;
  v_claimed_points INT;
  v_award RECORD;
  v_awarded INT;
  v_tawaf_done BOOLEAN;
  v_achievement_unlocked BOOLEAN;
BEGIN
  IF p_user_id IS NULL
     OR p_challenge_key IS DISTINCT FROM 'tawaf-knowledge-' || to_char(v_today, 'YYYY-MM-DD')
     OR p_is_correct IS NULL
     OR p_points IS NULL
     OR p_points < 0
     OR p_points > 200 THEN
    RAISE EXCEPTION 'Invalid Virtual Hajj challenge submission';
  END IF;

  INSERT INTO public.virtual_hajj_challenge_attempts (user_id, challenge_date)
  VALUES (p_user_id, v_today)
  ON CONFLICT (user_id, challenge_date) DO NOTHING;

  SELECT a.attempts_used
  INTO v_used
  FROM public.virtual_hajj_challenge_attempts AS a
  WHERE a.user_id = p_user_id AND a.challenge_date = v_today
  FOR UPDATE;

  SELECT c.points_awarded
  INTO v_claimed_points
  FROM public.virtual_hajj_challenge_claims AS c
  WHERE c.user_id = p_user_id AND c.challenge_key = p_challenge_key;

  IF FOUND THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.virtual_hajj_level_progress AS lp
      WHERE lp.user_id = p_user_id
        AND lp.level_id = 'safa-marwah-learning'
        AND lp.unlocked_at IS NOT NULL
    ) INTO v_tawaf_done;
    SELECT EXISTS (
      SELECT 1
      FROM public.virtual_hajj_achievements AS a
      WHERE a.user_id = p_user_id AND a.achievement_id = 'tawaf-learner'
    ) INTO v_achievement_unlocked;

    SELECT
      up.total_points, up.weekly_points, up.monthly_points, up.today_points
    INTO
      total_points, weekly_points, monthly_points, today_points
    FROM public.users_points AS up
    WHERE up.user_id = p_user_id;

    success := TRUE;
    correct := TRUE;
    already_completed := TRUE;
    attempts_used := v_used;
    attempts_remaining := GREATEST(0, 5 - v_used);
    points_awarded := v_claimed_points;
    daily_limit := 200;
    next_level_unlocked := COALESCE(v_tawaf_done, FALSE);
    achievement_unlocked := COALESCE(v_achievement_unlocked, FALSE);
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_used >= 5 THEN
    success := FALSE;
    correct := FALSE;
    already_completed := FALSE;
    attempts_used := v_used;
    attempts_remaining := 0;
    points_awarded := 0;
    total_points := NULL;
    weekly_points := NULL;
    monthly_points := NULL;
    today_points := NULL;
    daily_limit := 200;
    next_level_unlocked := FALSE;
    achievement_unlocked := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  v_used := v_used + 1;
  UPDATE public.virtual_hajj_challenge_attempts AS a
  SET attempts_used = v_used
  WHERE a.user_id = p_user_id AND a.challenge_date = v_today;

  IF NOT p_is_correct THEN
    success := TRUE;
    correct := FALSE;
    already_completed := FALSE;
    attempts_used := v_used;
    attempts_remaining := 5 - v_used;
    points_awarded := 0;
    total_points := NULL;
    weekly_points := NULL;
    monthly_points := NULL;
    today_points := NULL;
    daily_limit := 200;
    next_level_unlocked := FALSE;
    achievement_unlocked := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_points > 0 THEN
    SELECT * INTO v_award
    FROM public.award_points_capped(p_user_id, p_points, 200, TRUE);

    IF NOT v_award.success THEN
      RAISE EXCEPTION 'Could not award Virtual Hajj points: %', v_award.reason;
    END IF;
    v_awarded := v_award.points_awarded;
    total_points := v_award.total_points;
    weekly_points := v_award.weekly_points;
    monthly_points := v_award.monthly_points;
    today_points := v_award.today_points;
  ELSE
    v_awarded := 0;
    SELECT
      up.total_points, up.weekly_points, up.monthly_points, up.today_points
    INTO
      total_points, weekly_points, monthly_points, today_points
    FROM public.users_points AS up
    WHERE up.user_id = p_user_id;
  END IF;

  INSERT INTO public.virtual_hajj_challenge_claims (user_id, challenge_key, points_awarded)
  VALUES (p_user_id, p_challenge_key, v_awarded);

  INSERT INTO public.virtual_hajj_level_progress AS existing (user_id, level_id, unlocked_at, completed_at)
  VALUES
    (p_user_id, 'tawaf-learning', NOW(), NOW()),
    (p_user_id, 'safa-marwah-learning', NOW(), NULL)
  ON CONFLICT (user_id, level_id) DO UPDATE
  SET unlocked_at = COALESCE(existing.unlocked_at, EXCLUDED.unlocked_at),
      completed_at = COALESCE(existing.completed_at, EXCLUDED.completed_at);

  INSERT INTO public.game_progress (uid, gameid, points, playedat)
  VALUES (p_user_id, 'virtual-hajj:' || p_challenge_key, v_awarded, NOW());

  INSERT INTO public.virtual_hajj_achievements (user_id, achievement_id)
  VALUES (p_user_id, 'tawaf-learner')
  ON CONFLICT (user_id, achievement_id) DO NOTHING;

  success := TRUE;
  correct := TRUE;
  already_completed := FALSE;
  attempts_used := v_used;
  attempts_remaining := 5 - v_used;
  points_awarded := v_awarded;
  daily_limit := 200;
  next_level_unlocked := TRUE;
  achievement_unlocked := TRUE;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_virtual_hajj_challenge(UUID, TEXT, BOOLEAN, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_virtual_hajj_challenge(UUID, TEXT, BOOLEAN, INT) TO service_role;
