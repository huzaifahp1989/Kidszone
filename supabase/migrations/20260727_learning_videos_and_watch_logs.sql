CREATE TABLE IF NOT EXISTS public.learning_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'upload', 'external')),
  video_url TEXT NOT NULL,
  youtube_video_id TEXT,
  thumbnail_url TEXT,
  duration_seconds INT,
  points_reward INT NOT NULL DEFAULT 25 CHECK (points_reward >= 0 AND points_reward <= 200),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_videos_active_created
  ON public.learning_videos (is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS public.video_watch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.learning_videos(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  watch_date DATE NOT NULL DEFAULT (timezone('utc', now())::date),
  watched_seconds INT,
  awarded_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, video_id, watch_date)
);

CREATE INDEX IF NOT EXISTS idx_video_watch_logs_user_date
  ON public.video_watch_logs (user_id, watch_date DESC);

CREATE INDEX IF NOT EXISTS idx_video_watch_logs_video
  ON public.video_watch_logs (video_id);

ALTER TABLE public.learning_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_watch_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'learning_videos' AND policyname = 'Public can view active learning videos'
  ) THEN
    CREATE POLICY "Public can view active learning videos"
      ON public.learning_videos FOR SELECT
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'video_watch_logs' AND policyname = 'Users can view own video watch logs'
  ) THEN
    CREATE POLICY "Users can view own video watch logs"
      ON public.video_watch_logs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT ON public.learning_videos TO anon, authenticated;
GRANT SELECT ON public.video_watch_logs TO authenticated;
GRANT ALL ON public.learning_videos TO service_role;
GRANT ALL ON public.video_watch_logs TO service_role;
