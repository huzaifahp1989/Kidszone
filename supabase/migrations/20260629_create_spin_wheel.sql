-- Weekly winner spin wheel: one spin per approved winner per week (Sat–Fri UK week).

```CREATE TABLE IF NOT EXISTS public.spin_wheel_spins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  reward_key TEXT NOT NULL,
  reward_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS spin_wheel_spins_week_idx
  ON public.spin_wheel_spins (week_start_date);

CREATE INDEX IF NOT EXISTS spin_wheel_spins_reward_week_idx
  ON public.spin_wheel_spins (week_start_date, reward_key);

ALTER TABLE public.spin_wheel_spins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_spin_wheel_spins" ON public.spin_wheel_spins;
CREATE POLICY "read_spin_wheel_spins"
ON public.spin_wheel_spins
FOR SELECT
USING (true);

GRANT SELECT ON public.spin_wheel_spins TO anon, authenticated;
GRANT ALL ON public.spin_wheel_spins TO service_role;
````