-- ============================================================================
-- WEEKLY RESET FUNCTION
-- ============================================================================
-- Run this in Supabase SQL Editor to enable the weekly reset functionality
-- ============================================================================

-- 1. Create a function to reset weekly points
CREATE OR REPLACE FUNCTION reset_weekly_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run as database owner to bypass RLS
AS $$
BEGIN
  -- Reset weekly points in users_points table
  UPDATE users_points
  SET weekly_points = 0;

  -- Sync with users table (if you are maintaining a copy there)
  UPDATE users
  SET weekly_points = 0;
END;
$$;

-- 2. Grant access to the function
GRANT EXECUTE ON FUNCTION reset_weekly_leaderboard() TO service_role;
-- We typically restrict this to service_role (server-side only) for security
-- If you want to test from client (not recommended for production), add 'authenticated'
