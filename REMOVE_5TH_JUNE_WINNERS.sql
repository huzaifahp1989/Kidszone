-- Remove weekly winner record tied to 5th June 2026
-- Run in Supabase SQL Editor

BEGIN;

DELETE FROM public.weekly_winners
WHERE DATE '2026-06-05' BETWEEN week_start_date AND week_end_date
   OR week_start_date = DATE '2026-06-05'
   OR week_end_date = DATE '2026-06-05';

-- Verify nothing remains for that date.
SELECT *
FROM public.weekly_winners
WHERE DATE '2026-06-05' BETWEEN week_start_date AND week_end_date
   OR week_start_date = DATE '2026-06-05'
   OR week_end_date = DATE '2026-06-05';

COMMIT;
