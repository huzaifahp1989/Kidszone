-- Ensure age + city columns exist on public.users for profile gate and admin edits

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS age INTEGER;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN public.users.age IS 'Learner age (required for age-banded content)';
COMMENT ON COLUMN public.users.city IS 'Learner city/town (required before taking part)';

CREATE INDEX IF NOT EXISTS idx_users_city ON public.users (city);
CREATE INDEX IF NOT EXISTS idx_users_age ON public.users (age);
