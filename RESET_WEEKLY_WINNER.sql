-- Use this script to remove the current week's winner (e.g. if generated for testing)
-- Run this in the Supabase SQL Editor

DELETE FROM public.weekly_winners 
WHERE week_start_date = date_trunc('week', CURRENT_DATE)::DATE;

-- If you want to clear ALL history of winners, uncomment the line below:
-- TRUNCATE TABLE public.weekly_winners;
