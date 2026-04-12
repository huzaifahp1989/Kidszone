-- ============================================================================
-- Update Recordings Table Schema (Non-destructive)
-- Run this in Supabase SQL Editor to add studio support
-- ============================================================================

-- 1. Add new columns for Studio Recordings
ALTER TABLE public.recordings ADD COLUMN IF NOT EXISTS child_name TEXT;
ALTER TABLE public.recordings ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.recordings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.recordings ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0;
ALTER TABLE public.recordings ADD COLUMN IF NOT EXISTS audio_path TEXT;
ALTER TABLE public.recordings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted';

-- 2. Make user_id and story_id nullable (for guest/studio recordings)
ALTER TABLE public.recordings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.recordings ALTER COLUMN story_id DROP NOT NULL;

-- 3. Fix Foreign Key to point to public.users (for Admin UI joins)
ALTER TABLE public.recordings DROP CONSTRAINT IF EXISTS recordings_user_id_fkey;
-- Try to link to public.users(uid) first as that's what the Admin UI uses for joins
-- If this fails, it might be because uid is not unique or PK, but based on usage it should be.
ALTER TABLE public.recordings ADD CONSTRAINT recordings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(uid) ON DELETE SET NULL;

-- 4. Ensure Foreign Key for story_id exists
ALTER TABLE public.recordings DROP CONSTRAINT IF EXISTS recordings_story_id_fkey;
ALTER TABLE public.recordings ADD CONSTRAINT recordings_story_id_fkey 
  FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE SET NULL;

-- 5. Verify policies (Optional - re-run just in case)
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own recordings (or guest recordings if we allow that, but typically RLS relies on auth)
-- For guests (anon), we might need a policy if they insert directly, but usually they go through an API that uses service role or anon key.
-- If using anon key, we need a policy for anon.
-- However, our API `src/app/api/studio-submit/route.ts` uses `supabaseAdmin` (Service Role), so it bypasses RLS.
-- So we only need policies for the frontend `My Recordings` page which uses the user's session.

DROP POLICY IF EXISTS "Users can insert own recordings" ON public.recordings;
CREATE POLICY "Users can insert own recordings"
  ON public.recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own recordings" ON public.recordings;
CREATE POLICY "Users can view own recordings"
  ON public.recordings FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Grant permissions
GRANT ALL ON public.recordings TO authenticated;
GRANT ALL ON public.recordings TO service_role;
