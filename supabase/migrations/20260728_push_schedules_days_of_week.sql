-- Multi-day weekly schedules (Mon/Wed/Fri etc.). Previously only existed as
-- an unapplied root-level script ADD_PUSH_SCHEDULE_DAYS_OF_WEEK.sql.
ALTER TABLE push_schedules
  ADD COLUMN IF NOT EXISTS days_of_week INTEGER[] DEFAULT NULL;

COMMENT ON COLUMN push_schedules.days_of_week IS
  '0=Sun … 6=Sat. Used when frequency=weekly. Null/empty falls back to day_of_week.';

-- Backfill any legacy weekly rows that still only carry the single day_of_week.
UPDATE push_schedules
SET days_of_week = ARRAY[day_of_week]
WHERE frequency = 'weekly'
  AND day_of_week IS NOT NULL
  AND (days_of_week IS NULL OR cardinality(days_of_week) = 0);
