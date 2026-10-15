-- Additive migration: weekly activity milestone claims + admin points config.
-- No existing tables or columns are dropped or renamed.

-- 1) Weekly milestone bonus claims (one per user per week).
CREATE TABLE IF NOT EXISTS public.weekly_milestone_claims (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,             -- e.g. 2026-W41
  threshold INTEGER NOT NULL DEFAULT 3,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_milestone_claims_user_week
  ON public.weekly_milestone_claims (user_id, week_key);

CREATE INDEX IF NOT EXISTS idx_weekly_milestone_claims_week
  ON public.weekly_milestone_claims (week_key);

-- 2) Admin-configurable points values (key/value with safe defaults).
CREATE TABLE IF NOT EXISTS public.points_config (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed safe defaults only if rows do not already exist.
INSERT INTO public.points_config (key, value) VALUES
  ('quiz_correct', 25),
  ('game_activity', 25),
  ('arabic_activity', 25),
  ('quran_activity', 25),
  ('daily_bonus', 50),
  ('weekly_bonus', 50),
  ('milestone_bonus', 30),
  ('milestone_threshold', 3)
ON CONFLICT (key) DO NOTHING;
