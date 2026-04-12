-- ============================================================================
-- Islamic Kids Learning Platform - Supabase Tables Setup
-- ============================================================================
-- Run this SQL in your Supabase dashboard (SQL Editor)
-- Project: jlqrbbqsuksncrxjcmbc
-- ============================================================================

-- Drop existing tables if they exist (be careful in production!)
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS quiz_progress CASCADE;
-- DROP TABLE IF EXISTS leaderboard CASCADE;

-- ============================================================================
-- 1. USERS TABLE (Main user profile table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  role TEXT DEFAULT 'kid' CHECK (role IN ('kid', 'admin', 'parent')),
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 5 AND age <= 14),
  guardianEmail TEXT,
  madrasahName TEXT,
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  weeklyPoints INTEGER DEFAULT 0 CHECK (weeklyPoints >= 0),
  monthlyPoints INTEGER DEFAULT 0 CHECK (monthlyPoints >= 0),
  level TEXT DEFAULT 'Beginner' CHECK (level IN ('Beginner', 'Learner', 'Explorer', 'Young Scholar')),
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_level_idx ON users(level);
CREATE INDEX IF NOT EXISTS users_points_idx ON users(points DESC);
CREATE INDEX IF NOT EXISTS users_weeklyPoints_idx ON users(weeklyPoints DESC);
CREATE INDEX IF NOT EXISTS users_monthlyPoints_idx ON users(monthlyPoints DESC);

CREATE TABLE IF NOT EXISTS quiz_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score INTEGER DEFAULT 0 CHECK (score >= 0),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(uid, category)
);

CREATE INDEX IF NOT EXISTS quiz_progress_uid_idx ON quiz_progress(uid);
CREATE INDEX IF NOT EXISTS quiz_progress_category_idx ON quiz_progress(category);
CREATE INDEX IF NOT EXISTS quiz_progress_completed_idx ON quiz_progress(completed_at DESC);

-- ============================================================================
-- 3. GAME PROGRESS TABLE (Track game plays and scores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  gameId TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  playedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_progress_uid_idx ON game_progress(uid);
CREATE INDEX IF NOT EXISTS game_progress_playedAt_idx ON game_progress(playedAt DESC);

-- ============================================================================
-- 4. LEADERBOARD VIEW (Real-time leaderboard aggregation)
-- ============================================================================
CREATE OR REPLACE VIEW leaderboard_weekly AS
SELECT 
  uid,
  name,
  level,
  weeklyPoints as points,
  ROW_NUMBER() OVER (ORDER BY weeklyPoints DESC, uid ASC) as rank
FROM users
WHERE weeklyPoints > 0
ORDER BY weeklyPoints DESC;

CREATE OR REPLACE VIEW leaderboard_monthly AS
SELECT 
  uid,
  name,
  level,
  monthlyPoints as points,
  ROW_NUMBER() OVER (ORDER BY monthlyPoints DESC, uid ASC) as rank
FROM users
WHERE monthlyPoints > 0
ORDER BY monthlyPoints DESC;

CREATE OR REPLACE VIEW leaderboard_all_time AS
SELECT 
  uid,
  name,
  level,
  points,
  ROW_NUMBER() OVER (ORDER BY points DESC, uid ASC) as rank
FROM users
WHERE points > 0
ORDER BY points DESC;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Policy 1: Users can read their own profile
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
CREATE POLICY "Users can read their own profile" ON users
  FOR SELECT USING (auth.uid() = uid);

-- Policy 2: Authenticated users can read all user profiles (for leaderboard)
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON users;
CREATE POLICY "Authenticated users can read all profiles" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 3: Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = uid);

-- Policy 4: Users can update their own profile (points, level, name)
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = uid)
  WITH CHECK (auth.uid() = uid);

-- ============================================================================

-- Policy 1: Users can read their own quiz progress
DROP POLICY IF EXISTS "Users can read own quiz progress" ON quiz_progress;
CREATE POLICY "Users can read own quiz progress" ON quiz_progress
  FOR SELECT USING (auth.uid() = uid);

-- Policy 2: Users can insert their own quiz records
DROP POLICY IF EXISTS "Users can insert quiz progress" ON quiz_progress;
CREATE POLICY "Users can insert quiz progress" ON quiz_progress
  FOR INSERT WITH CHECK (auth.uid() = uid);

-- ============================================================================
-- GAME_PROGRESS TABLE POLICIES
-- ============================================================================

-- Policy 1: Users can read their own game progress
DROP POLICY IF EXISTS "Users can read own game progress" ON game_progress;
CREATE POLICY "Users can read own game progress" ON game_progress
  FOR SELECT USING (auth.uid() = uid);

-- Policy 2: Users can insert their own game records
DROP POLICY IF EXISTS "Users can insert game progress" ON game_progress;
CREATE POLICY "Users can insert game progress" ON game_progress
  FOR INSERT WITH CHECK (auth.uid() = uid);

-- ============================================================================
-- ADDITIONAL SETUP INSTRUCTIONS
-- ============================================================================
-- 1. Go to Authentication > Providers in Supabase dashboard
-- 2. Find "Anonymous" provider and toggle it ON
-- 3. Save settings
-- 4. Run this SQL in the SQL Editor
-- 5. Verify tables are created: Check "Table Editor"
-- 6. Test: Restart your app and sign in
-- ============================================================================

-- Optional: Insert test data (uncomment to use)
-- INSERT INTO users (email, role, name, age, points, weeklyPoints, monthlyPoints, level)
-- VALUES 
--   ('aisha@example.com', 'kid', 'Aisha', 10, 150, 75, 60, 'Learner'),
--   ('omar@example.com', 'kid', 'Omar', 12, 250, 120, 100, 'Explorer'),
--   ('fatima@example.com', 'kid', 'Fatima', 8, 85, 35, 25, 'Beginner');
