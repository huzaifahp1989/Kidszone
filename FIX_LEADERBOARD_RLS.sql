-- ============================================================================
-- FIX LEADERBOARD RLS POLICIES
-- ============================================================================
-- This script updates Row Level Security (RLS) policies to allow the leaderboard
-- to display points and badges for ALL users, not just the current user.
-- ============================================================================

-- 1. Update users_points table policies
ALTER TABLE public.users_points ENABLE ROW LEVEL SECURITY;

-- Drop the restrictive policy that only allows viewing own points
DROP POLICY IF EXISTS "Users can view own points" ON public.users_points;

-- Create a new policy that allows ALL authenticated users to view ALL points records
-- This is required for the leaderboard to function correctly
CREATE POLICY "Authenticated users can view all points"
  ON public.users_points FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Update users table policies (to read names)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Ensure authenticated users can read all user profiles (for names/levels)
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.users;

CREATE POLICY "Authenticated users can read all profiles"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Update weekly_winners policies (for displaying previous winners)
ALTER TABLE public.weekly_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view winners" ON public.weekly_winners;

CREATE POLICY "Authenticated users can view winners"
  ON public.weekly_winners FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Verify public access (optional, if you want public leaderboards)
-- If you want the leaderboard to be visible to non-logged in users too, 
-- uncomment the following lines:
-- DROP POLICY IF EXISTS "Public can view all points" ON public.users_points;
-- CREATE POLICY "Public can view all points" ON public.users_points FOR SELECT USING (true);
-- DROP POLICY IF EXISTS "Public can view all profiles" ON public.users;
-- CREATE POLICY "Public can view all profiles" ON public.users FOR SELECT USING (true);
