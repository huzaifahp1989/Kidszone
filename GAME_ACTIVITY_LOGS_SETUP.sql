-- Create game activity logs for monthly certificates and admin tracking
CREATE TABLE IF NOT EXISTS public.game_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_id TEXT NOT NULL,
  game_title TEXT,
  points_earned INT NOT NULL DEFAULT 0,
  difficulty TEXT,
  tasks_played INT NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_activity_logs_user_id ON public.game_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_game_activity_logs_played_at ON public.game_activity_logs(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_activity_logs_user_played_at ON public.game_activity_logs(user_id, played_at DESC);

ALTER TABLE public.game_activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_activity_logs'
      AND policyname = 'Users can view own game logs'
  ) THEN
    CREATE POLICY "Users can view own game logs"
      ON public.game_activity_logs
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;
