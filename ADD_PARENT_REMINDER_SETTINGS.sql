-- ============================================================================
-- Parent Reminder Settings + Tracking
-- Run this in Supabase SQL editor before enabling reminder cron.
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS parent_email TEXT;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reminder_frequency TEXT NOT NULL DEFAULT 'weekly';
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reminder_last_sent_at TIMESTAMPTZ;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reminder_unsubscribed_at TIMESTAMPTZ;

  -- Keep parent_email populated for existing rows where possible.
  UPDATE public.users
  SET parent_email = email
  WHERE (parent_email IS NULL OR btrim(parent_email) = '')
    AND email IS NOT NULL
    AND btrim(email) <> '';

  -- Guard accepted values.
  ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS users_reminder_frequency_check;

  ALTER TABLE public.users
    ADD CONSTRAINT users_reminder_frequency_check
    CHECK (reminder_frequency IN ('daily', '3x_week', 'weekly'));
END $$;

CREATE INDEX IF NOT EXISTS idx_users_reminder_opt_in
  ON public.users (reminder_opt_in, reminder_frequency, reminder_last_sent_at);

CREATE INDEX IF NOT EXISTS idx_users_parent_email
  ON public.users (parent_email);
