-- Scheduled push notifications (daily / weekly + time)
CREATE TABLE IF NOT EXISTS push_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT DEFAULT '/quiz',
  image_url TEXT,
  audience TEXT NOT NULL DEFAULT 'kids_zone',
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly')),
  time_of_day TEXT NOT NULL DEFAULT '16:00',
  day_of_week INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
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

ALTER TABLE push_schedules ADD COLUMN IF NOT EXISTS image_url TEXT;
