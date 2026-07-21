-- Hifz (memorization) progress per surah
CREATE TABLE IF NOT EXISTS hifz_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surah_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('learning', 'memorized')),
  ayahs_memorized INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, surah_number)
);

CREATE INDEX IF NOT EXISTS idx_hifz_progress_user ON hifz_progress(user_id);

ALTER TABLE hifz_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own hifz" ON hifz_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own hifz" ON hifz_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own hifz" ON hifz_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own hifz" ON hifz_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Push notification device tokens (for native app)
CREATE TABLE IF NOT EXISTS push_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_notification_tokens(user_id);

ALTER TABLE push_notification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens" ON push_notification_tokens
  FOR ALL USING (auth.uid() = user_id);
