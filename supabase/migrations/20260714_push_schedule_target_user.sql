ALTER TABLE public.push_schedules
  ADD COLUMN IF NOT EXISTS target_user_id TEXT;
