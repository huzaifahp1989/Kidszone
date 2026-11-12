-- Hifz revision schedule (spaced repetition)
--
-- Tracks when each memorised surah is next due for revision. On every successful
-- revision the review interval advances along a Leitner-style ladder of
-- 1, 3, 7, 14, 30, 60 days (see SPACED_INTERVALS_DAYS in
-- src/lib/hifz-revision-core.ts). A "needs practice" answer resets the interval
-- back to 1 day so the surah comes round again tomorrow.
--
-- Mirrors the hifz_progress table: per-user RLS, UUID pk, snake_case columns.
CREATE TABLE IF NOT EXISTS hifz_revision_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surah_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'due', 'completed', 'snoozed')),
  interval_days INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, surah_number)
);

CREATE INDEX IF NOT EXISTS idx_hifz_revision_user ON hifz_revision_schedule(user_id);

CREATE INDEX IF NOT EXISTS idx_hifz_revision_user_due ON hifz_revision_schedule(user_id, due_at);

ALTER TABLE hifz_revision_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own hifz revision" ON hifz_revision_schedule
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own hifz revision" ON hifz_revision_schedule
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own hifz revision" ON hifz_revision_schedule
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own hifz revision" ON hifz_revision_schedule
  FOR DELETE USING (auth.uid() = user_id);
