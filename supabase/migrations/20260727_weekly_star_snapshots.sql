-- Archive weekly star outcomes per user so admin can review historical weekly stars.

CREATE TABLE IF NOT EXISTS public.weekly_star_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  user_id UUID NOT NULL,
  active_days INT NOT NULL DEFAULT 0,
  weekly_stars INT NOT NULL DEFAULT 0,
  weekly_points_at_close INT NOT NULL DEFAULT 0,
  monthly_points_at_close INT NOT NULL DEFAULT 0,
  total_points_at_close INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT weekly_star_snapshots_unique UNIQUE (week_start_date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_star_snapshots_week
  ON public.weekly_star_snapshots (week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_star_snapshots_user
  ON public.weekly_star_snapshots (user_id, week_start_date DESC);

ALTER TABLE public.weekly_star_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'weekly_star_snapshots'
      AND policyname = 'Service role manages weekly star snapshots'
  ) THEN
    CREATE POLICY "Service role manages weekly star snapshots"
      ON public.weekly_star_snapshots
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON public.weekly_star_snapshots TO service_role;
