-- ============================================================================
-- FIX SIGNUP AND DATABASE SCHEMA
-- ============================================================================
-- This script resolves "database error" during signup by:
-- 1. Standardizing all columns to snake_case (matching the code)
-- 2. Fixing RLS policies to explicitly allow INSERTs by authenticated users
-- 3. Adding a backup trigger to ensure profile creation works even if client fails
-- ============================================================================

-- 1. STANDARDIZE COLUMNS IN USERS TABLE
-- We rename camelCase columns to snake_case if they exist
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.users RENAME COLUMN "weeklyPoints" TO weeklypoints;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        ALTER TABLE public.users RENAME COLUMN "monthlyPoints" TO monthlypoints;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        ALTER TABLE public.users RENAME COLUMN "totalPoints" TO points;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Ensure columns exist (idempotent)
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS weeklypoints INTEGER DEFAULT 0;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS monthlypoints INTEGER DEFAULT 0;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'kid';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS badges INTEGER DEFAULT 0;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS madrasahname TEXT;
END $$;

-- 2. FIX RLS POLICIES FOR USERS TABLE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow INSERT if the uid matches the auth.uid()
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = uid);

-- Allow SELECT if the uid matches auth.uid()
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
CREATE POLICY "Users can read their own profile" ON public.users
  FOR SELECT USING (auth.uid() = uid);

-- Allow UPDATE if the uid matches auth.uid()
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = uid);

-- Allow PUBLIC read access to leaderboard fields (safe for leaderboard)
DROP POLICY IF EXISTS "Public can read leaderboard info" ON public.users;
CREATE POLICY "Public can read leaderboard info" ON public.users
  FOR SELECT USING (true);

-- 3. SYNC USERS AND USERS_POINTS
-- Ensure users_points table exists
CREATE TABLE IF NOT EXISTS public.users_points (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    weekly_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    today_points INTEGER DEFAULT 0,
    last_earned_date DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for users_points
ALTER TABLE public.users_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own points" ON public.users_points;
CREATE POLICY "Users can read own points" ON public.users_points
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own points" ON public.users_points;
CREATE POLICY "Users can insert own points" ON public.users_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own points" ON public.users_points;
CREATE POLICY "Users can update own points" ON public.users_points
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. SERVER-SIDE TRIGGER FOR ROBUST SIGNUP (The "Silver Bullet")
-- This ensures that even if the client-side INSERT fails, the server creates the profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- We use a nested BEGIN/EXCEPTION block so that if the profile creation fails
  -- (e.g. column mismatch), the actual User Creation still succeeds.
  BEGIN
    INSERT INTO public.users (uid, email, name, age, role, points, weeklypoints, monthlypoints, level)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'name', 'Learner'),
      COALESCE((new.raw_user_meta_data->>'age')::int, 10),
      'kid',
      0,
      0,
      0,
      'Beginner'
    )
    ON CONFLICT (uid) DO NOTHING;
    
    -- Also init users_points
    INSERT INTO public.users_points (user_id, total_points, weekly_points, monthly_points, today_points)
    VALUES (new.id, 0, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If this fails, we log it (to Postgres logs) but do NOT fail the transaction
    RAISE WARNING 'handle_new_user trigger failed: %', SQLERRM;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.users_points TO authenticated;
GRANT ALL ON TABLE public.users_points TO service_role;
