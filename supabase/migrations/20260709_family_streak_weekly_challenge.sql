-- Family shared streak + weekly challenge badge tracking

CREATE TABLE IF NOT EXISTS public.family_streaks (
  family_email TEXT PRIMARY KEY,
  streak INT NOT NULL DEFAULT 0,
  last_mission_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_weekly_challenge_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  theme_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start_date, theme_key)
);

CREATE INDEX IF NOT EXISTS idx_user_weekly_challenge_badges_user
  ON public.user_weekly_challenge_badges (user_id, week_start_date DESC);

ALTER TABLE public.family_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_weekly_challenge_badges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'family_streaks' AND policyname = 'Users can view own family streak'
  ) THEN
    CREATE POLICY "Users can view own family streak"
      ON public.family_streaks FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_weekly_challenge_badges' AND policyname = 'Users can view own weekly challenge badges'
  ) THEN
    CREATE POLICY "Users can view own weekly challenge badges"
      ON public.user_weekly_challenge_badges FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT ON public.family_streaks TO authenticated, anon;
GRANT SELECT ON public.user_weekly_challenge_badges TO authenticated, anon;
GRANT ALL ON public.family_streaks TO service_role;
GRANT ALL ON public.user_weekly_challenge_badges TO service_role;
