-- Ramadan mode: optional fasting log + daily activity tracking

CREATE TABLE IF NOT EXISTS public.ramadan_fast_logs (
  user_id UUID NOT NULL,
  fast_date DATE NOT NULL,
  noted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, fast_date)
);

CREATE INDEX IF NOT EXISTS idx_ramadan_fast_logs_user_date
  ON public.ramadan_fast_logs (user_id, fast_date DESC);

ALTER TABLE public.ramadan_fast_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ramadan_fast_logs' AND policyname = 'Users can view own ramadan fast logs'
  ) THEN
    CREATE POLICY "Users can view own ramadan fast logs"
      ON public.ramadan_fast_logs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT ON public.ramadan_fast_logs TO authenticated, anon;
GRANT ALL ON public.ramadan_fast_logs TO service_role;
