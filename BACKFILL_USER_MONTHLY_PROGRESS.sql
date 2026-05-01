-- Backfill monthly points/progress for each user from previous months
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.user_monthly_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month_start DATE NOT NULL,
  month_key TEXT GENERATED ALWAYS AS (to_char(month_start, 'YYYY-MM')) STORED,
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

CREATE INDEX IF NOT EXISTS idx_user_monthly_progress_user_month
  ON public.user_monthly_progress(user_id, month_start DESC);

ALTER TABLE public.user_monthly_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_monthly_progress'
      AND policyname = 'Users can view own monthly progress'
  ) THEN
    CREATE POLICY "Users can view own monthly progress"
      ON public.user_monthly_progress
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_user_monthly_progress(p_from DATE DEFAULT DATE '2023-01-01')
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  WITH quiz AS (
    SELECT
      qa.user_id,
      date_trunc('month', qa.completed_at)::date AS month_start,
      COUNT(*)::int AS quiz_attempts,
      COALESCE(SUM(qa.score), 0)::int AS points_from_quiz
    FROM public.quiz_attempts qa
    WHERE qa.completed_at IS NOT NULL
      AND qa.completed_at::date >= p_from
    GROUP BY qa.user_id, date_trunc('month', qa.completed_at)::date
  ),
  pledge AS (
    SELECT
      p.user_id,
      date_trunc('month', p.created_at)::date AS month_start,
      COUNT(*)::int AS pledge_logs,
      COALESCE(SUM(p.count), 0)::int AS pledge_recitations
    FROM public.pledges p
    WHERE p.created_at IS NOT NULL
      AND p.created_at::date >= p_from
    GROUP BY p.user_id, date_trunc('month', p.created_at)::date
  ),
  games AS (
    SELECT
      g.user_id,
      date_trunc('month', g.played_at)::date AS month_start,
      COUNT(*)::int AS game_sessions,
      COALESCE(SUM(g.points_earned), 0)::int AS points_from_games
    FROM public.game_activity_logs g
    WHERE g.played_at IS NOT NULL
      AND g.played_at::date >= p_from
    GROUP BY g.user_id, date_trunc('month', g.played_at)::date
  ),
  month_union AS (
    SELECT user_id, month_start FROM quiz
    UNION
    SELECT user_id, month_start FROM pledge
    UNION
    SELECT user_id, month_start FROM games
  ),
  merged AS (
    SELECT
      u.user_id,
      u.month_start,
      COALESCE(q.quiz_attempts, 0) AS quiz_attempts,
      COALESCE(q.points_from_quiz, 0) AS points_from_quiz,
      COALESCE(p.pledge_logs, 0) AS pledge_logs,
      COALESCE(p.pledge_recitations, 0) AS pledge_recitations,
      COALESCE(g.game_sessions, 0) AS game_sessions,
      COALESCE(g.points_from_games, 0) AS points_from_games
    FROM month_union u
    LEFT JOIN quiz q ON q.user_id = u.user_id AND q.month_start = u.month_start
    LEFT JOIN pledge p ON p.user_id = u.user_id AND p.month_start = u.month_start
    LEFT JOIN games g ON g.user_id = u.user_id AND g.month_start = u.month_start
  )
  INSERT INTO public.user_monthly_progress (
    user_id,
    month_start,
    quiz_attempts,
    points_from_quiz,
    pledge_logs,
    pledge_recitations,
    game_sessions,
    points_from_games,
    total_activities,
    total_points,
    certificate_qualified,
    updated_at
  )
  SELECT
    m.user_id,
    m.month_start,
    m.quiz_attempts,
    m.points_from_quiz,
    m.pledge_logs,
    m.pledge_recitations,
    m.game_sessions,
    m.points_from_games,
    (m.quiz_attempts + m.pledge_logs + m.game_sessions) AS total_activities,
    (m.points_from_quiz + m.points_from_games) AS total_points,
    ((m.quiz_attempts + m.pledge_logs + m.game_sessions) >= 3) AS certificate_qualified,
    NOW()
  FROM merged m
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET
    quiz_attempts = EXCLUDED.quiz_attempts,
    points_from_quiz = EXCLUDED.points_from_quiz,
    pledge_logs = EXCLUDED.pledge_logs,
    pledge_recitations = EXCLUDED.pledge_recitations,
    game_sessions = EXCLUDED.game_sessions,
    points_from_games = EXCLUDED.points_from_games,
    total_activities = EXCLUDED.total_activities,
    total_points = EXCLUDED.total_points,
    certificate_qualified = EXCLUDED.certificate_qualified,
    updated_at = NOW();
END;
$$;

-- Run the backfill from old data
SELECT public.refresh_user_monthly_progress('2023-01-01'::date);

-- Verify snapshots
SELECT month_key, COUNT(*) as users_count
FROM public.user_monthly_progress
GROUP BY month_key
ORDER BY month_key DESC;
