-- Kids Channel: category for Quran / Nasheed / Story videos
-- Run in Supabase SQL Editor if learning_videos already exists.

ALTER TABLE public.learning_videos
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'learning_videos_category_check'
  ) THEN
    ALTER TABLE public.learning_videos
      ADD CONSTRAINT learning_videos_category_check
      CHECK (category IN ('quran', 'nasheed', 'story', 'hadith', 'other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_learning_videos_category_active
  ON public.learning_videos (category, is_active, created_at DESC);
