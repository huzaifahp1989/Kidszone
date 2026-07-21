-- Scheduled push notifications (daily / weekly + time)
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS push_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT DEFAULT '/quiz',
  image_url TEXT,
  audience TEXT NOT NULL DEFAULT 'kids_zone',
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly')),
  time_of_day TEXT NOT NULL DEFAULT '16:00', -- HH:MM in timezone
  day_of_week INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)), -- 0=Sun … 6=Sat
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_schedules_due
  ON push_schedules(enabled, next_run_at)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_push_schedules_created
  ON push_schedules(created_at DESC);

ALTER TABLE push_schedules ENABLE ROW LEVEL SECURITY;

-- No public policies: the Next.js server must use SUPABASE_SERVICE_ROLE_KEY
-- (Project Settings → API → service_role), which bypasses RLS.
-- Without that key, schedule create/list will fail or look empty.

ALTER TABLE push_schedules ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Multi-day weekly: 0=Sun … 6=Sat (see also ADD_PUSH_SCHEDULE_DAYS_OF_WEEK.sql)
ALTER TABLE push_schedules ADD COLUMN IF NOT EXISTS days_of_week INTEGER[] DEFAULT NULL;
