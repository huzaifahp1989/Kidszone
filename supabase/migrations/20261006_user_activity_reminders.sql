ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminder_timezone TEXT NOT NULL DEFAULT 'Europe/London',
  ADD COLUMN IF NOT EXISTS reminder_last_sent_at JSONB DEFAULT NULL;

COMMENT ON COLUMN public.users.reminder_settings IS
  'Per-user reminder schedule for activities, prayers, and custom alarms.';
COMMENT ON COLUMN public.users.reminder_timezone IS
  'IANA timezone used to deliver reminders at the selected local time.';
COMMENT ON COLUMN public.users.reminder_last_sent_at IS
  'Tracks last successful push delivery per reminder key.';
