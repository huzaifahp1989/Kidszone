-- ============================================================================
-- FINAL FIX FOR LEADERBOARD VISIBILITY
-- ============================================================================
-- This script completely resets the "Select" (Read) policies for the leaderboard.
-- It ensures that ANYONE (logged in or not) can view the points and names.
-- This fixes the issue where you can't see other users.
-- ============================================================================

-- 1. UNLOCK 'users_points' TABLE (The scores)
ALTER TABLE public.users_points ENABLE ROW LEVEL SECURITY;

-- Drop ALL potential restricting policies for SELECT
DROP POLICY IF EXISTS "Users can view own points" ON public.users_points;
DROP POLICY IF EXISTS "Allow reading own points for leaderboard" ON public.users_points;
DROP POLICY IF EXISTS "Authenticated users can view all points" ON public.users_points;
DROP POLICY IF EXISTS "Public can view all points" ON public.users_points;

-- Create ONE simple policy: EVERYONE can see ALL scores
CREATE POLICY "Public can view all points"
  ON public.users_points FOR SELECT
  USING (true);


-- 2. UNLOCK 'users' TABLE (The names)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop ALL potential restricting policies for SELECT
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.users;
DROP POLICY IF EXISTS "Public can view all profiles" ON public.users;

-- Create ONE simple policy: EVERYONE can see ALL user profiles (names, levels)
CREATE POLICY "Public can view all profiles"
  ON public.users FOR SELECT
  USING (true);


-- 3. GRANT PERMISSIONS (Just to be safe)
GRANT SELECT ON TABLE public.users_points TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.users TO anon, authenticated, service_role;

-- 4. REFRESH CACHE (Optional, mainly for the database to update its query plan)
ANALYZE public.users_points;
ANALYZE public.users;
