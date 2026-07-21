-- 7-day mystery box claim tracking (one claim per user per unlock window)

CREATE TABLE IF NOT EXISTS public.mystery_box_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  unlock_key TEXT NOT NULL,
  points_awarded INT NOT NULL DEFAULT 0,
  badge_name TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, unlock_key)
);

CREATE INDEX IF NOT EXISTS idx_mystery_box_claims_user
  ON public.mystery_box_claims (user_id, claimed_at DESC);

ALTER TABLE public.mystery_box_claims ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mystery_box_claims' AND policyname = 'Users can view own mystery box claims'
  ) THEN
    CREATE POLICY "Users can view own mystery box claims"
      ON public.mystery_box_claims FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT ON public.mystery_box_claims TO authenticated, anon;
GRANT ALL ON public.mystery_box_claims TO service_role;
