-- Kids audio library: admin-uploaded tracks for kids to listen to.
-- Also ensure studio recording columns exist on recordings.

ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS child_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Allow guest studio submissions (user_id optional)
DO $$
BEGIN
  ALTER TABLE public.recordings ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.kids_audio_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'story'
    CHECK (category IN ('quran', 'nasheed', 'story', 'hadith')),
  audio_path TEXT NOT NULL,
  audio_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  cover_emoji TEXT DEFAULT '🎧',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS kids_audio_library_published_idx
  ON public.kids_audio_library (is_published, category, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS recordings_published_category_idx
  ON public.recordings (is_published, category, submitted_at DESC);

ALTER TABLE public.kids_audio_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published kids audio" ON public.kids_audio_library;
CREATE POLICY "Anyone can view published kids audio"
  ON public.kids_audio_library FOR SELECT
  USING (is_published = true);
