CREATE TABLE IF NOT EXISTS public.monthly_public_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key text NOT NULL CHECK (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  first_name text NOT NULL CHECK (length(trim(first_name)) BETWEEN 1 AND 40),
  age_bracket text NOT NULL CHECK (age_bracket IN ('5-7', '8-10', '11-12', '13-14')),
  city text NOT NULL CHECK (length(trim(city)) BETWEEN 1 AND 100),
  parent_guardian_consent boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS monthly_public_winners_month_idx
  ON public.monthly_public_winners (month_key DESC, created_at DESC);

ALTER TABLE public.monthly_public_winners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.monthly_public_winners FROM anon, authenticated;
GRANT ALL ON TABLE public.monthly_public_winners TO service_role;
