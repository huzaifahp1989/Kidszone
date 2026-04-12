-- ============================================================================
-- DAILY QUIZ SYSTEM TABLES
-- ============================================================================

-- 1. QUESTIONS POOL
-- Stores all available questions to be picked for daily quizzes
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('Quran Basics', 'Duas', 'Salah & Wudu', 'Seerah', 'Islamic Manners', 'Hadith', 'Prophets', 'Quran Stories', 'Akhlaq')),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of strings
  correct_answer_index INTEGER NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'Medium',
  reference TEXT, -- e.g., "Talimul Haq"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS questions_category_idx ON questions(category);
CREATE INDEX IF NOT EXISTS questions_last_used_idx ON questions(last_used_at);

-- 2. DAILY QUIZZES
-- Stores the generated quiz for each day
CREATE TABLE IF NOT EXISTS daily_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  question_ids JSONB NOT NULL, -- Array of UUIDs from questions table
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS daily_quizzes_date_idx ON daily_quizzes(quiz_date);

-- 3. QUIZ ATTEMPTS (Daily Quiz Specific)
-- Tracks user attempts for the daily quiz
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES daily_quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_seconds INTEGER,
  is_perfect_score BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE, -- Anti-cheat flag
  UNIQUE(user_id, quiz_id) -- Only one attempt per user per daily quiz
);

CREATE INDEX IF NOT EXISTS quiz_attempts_user_idx ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_quiz_idx ON quiz_attempts(quiz_id);

-- 4. POINTS LEDGER
-- Detailed transaction log for points (as requested)
CREATE TABLE IF NOT EXISTS points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL, -- 'quiz_attempt', 'streak_bonus', 'completion_bonus'
  reference_id UUID, -- Link to quiz_attempts.id or other source
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS points_ledger_user_idx ON points_ledger(user_id);

-- 5. WEEKLY WINNERS
-- Stores the selected winner for each week
CREATE TABLE IF NOT EXISTS weekly_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  winner_user_id UUID REFERENCES auth.users(id),
  selection_seed TEXT,
  eligible_participants JSONB, -- List of user IDs who were eligible
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Add Streak columns to users if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_streak_update DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_winners ENABLE ROW LEVEL SECURITY;

-- Questions: Everyone can read, only service role/admin can write
CREATE POLICY "Everyone can read questions" ON questions FOR SELECT USING (true);

-- Daily Quizzes: Everyone can read, only service role/admin can write
CREATE POLICY "Everyone can read daily quizzes" ON daily_quizzes FOR SELECT USING (true);

-- Quiz Attempts: Users can read/insert their own
CREATE POLICY "Users can read own attempts" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Points Ledger: Users can read their own
CREATE POLICY "Users can read own ledger" ON points_ledger FOR SELECT USING (auth.uid() = user_id);

-- Weekly Winners: Everyone can read
CREATE POLICY "Everyone can read winners" ON weekly_winners FOR SELECT USING (true);

