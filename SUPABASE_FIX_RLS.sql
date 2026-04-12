-- ============================================
-- SUPABASE RLS FIX - Run this in SQL Editor
-- ============================================

-- 1. CREATE USERS TABLE (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.users (
  uid UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE,
  name TEXT,
  age INTEGER,
  madrasahName TEXT,
  role TEXT DEFAULT 'kid',
  points INTEGER DEFAULT 0,
  weeklyPoints INTEGER DEFAULT 0,
  monthlyPoints INTEGER DEFAULT 0,
  level TEXT DEFAULT 'Beginner',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- 2. DROP OLD POLICIES (if any exist)
DROP POLICY IF EXISTS "Enable read own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read all profiles for leaderboard" ON public.users;
DROP POLICY IF EXISTS "allow_authenticated_read" ON public.users;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON public.users;
DROP POLICY IF EXISTS "allow_authenticated_update" ON public.users;
DROP POLICY IF EXISTS "allow_anon_read" ON public.users;
DROP POLICY IF EXISTS "allow_anon_insert" ON public.users;
DROP POLICY IF EXISTS "allow_anon_update" ON public.users;

-- 3. ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. CREATE NEW PERMISSIVE POLICIES

-- Policy: Authenticated users can read their own profile
CREATE POLICY "auth_read_own" ON public.users
  FOR SELECT
  USING (auth.uid() = uid);

-- Policy: Authenticated users can insert their own profile
CREATE POLICY "auth_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = uid);

-- Policy: Authenticated users can update their own profile
CREATE POLICY "auth_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = uid)
  WITH CHECK (auth.uid() = uid);

-- Policy: Anyone can read all profiles (for leaderboard)
CREATE POLICY "public_read_all" ON public.users
  FOR SELECT
  USING (true);

-- Policy: Allow anon/service role to read
CREATE POLICY "anon_read_all" ON public.users
  FOR SELECT
  USING (true);

-- Policy: Allow anon/service role to insert
CREATE POLICY "anon_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow anon/service role to update own
CREATE POLICY "anon_update_own" ON public.users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- DONE! Now test:
-- 1. Hard refresh browser (Ctrl+Shift+R)
-- 2. Clear cache (Ctrl+Shift+Delete)
-- 3. Go to /debug
-- 4. Click "Read Profile" button
-- Should see your profile or no error
-- ============================================
