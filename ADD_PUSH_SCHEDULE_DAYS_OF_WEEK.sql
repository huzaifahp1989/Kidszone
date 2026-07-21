-- Multi-day weekly schedules (pick Mon/Wed/Fri etc.)
-- Run in Supabase SQL editor.

ALTER TABLE push_schedules
  ADD COLUMN IF NOT EXISTS days_of_week INTEGER[] DEFAULT NULL;

COMMENT ON COLUMN push_schedules.days_of_week IS
  '0=Sun … 6=Sat. Used when frequency=weekly. Null/empty falls back to day_of_week.';

-- Backfill from single day_of_week where set
UPDATE push_schedules
SET days_of_week = ARRAY[day_of_week]
WHERE frequency = 'weekly'
  AND day_of_week IS NOT NULL
  AND (days_of_week IS NULL OR cardinality(days_of_week) = 0);
