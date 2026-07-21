-- Track topic and question set per quiz attempt for weekly + per-user rotation
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS question_ids JSONB;

CREATE INDEX IF NOT EXISTS quiz_attempts_user_topic_week_idx
  ON quiz_attempts (user_id, topic, completed_at DESC);
