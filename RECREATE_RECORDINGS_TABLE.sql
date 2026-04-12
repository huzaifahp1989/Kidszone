
-- ============================================================================
-- Recreate Recordings Table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Drop existing table if it exists
DROP TABLE IF EXISTS public.recordings;

-- 2. Create the table
CREATE TABLE public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(uid) ON DELETE SET NULL, -- Link to public.users profile (nullable for guests)
  child_name TEXT, -- Store name if guest or override
  title TEXT, -- For studio recordings
  description TEXT, -- For messages/notes
  story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL, -- Nullable for studio recordings
  audio_path TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  points_awarded INTEGER DEFAULT 0,
  admin_feedback TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies

-- Allow users to insert their own recordings
CREATE POLICY "Users can insert own recordings"
  ON public.recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own recordings
CREATE POLICY "Users can view own recordings"
  ON public.recordings FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins (service role) to do everything
-- (Service role bypasses RLS, but if we have admin users, we need policies for them too)
-- Assuming admins are just users with a specific role or we rely on service role for admin dashboard

-- Grant access to authenticated users
GRANT ALL ON public.recordings TO authenticated;
GRANT ALL ON public.recordings TO service_role;

-- 5. Fix Foreign Key for Join
-- The reference to public.users(uid) should allow the join:
-- .select('*, profile:users(name, email)')

-- Verify
SELECT * FROM public.recordings;
