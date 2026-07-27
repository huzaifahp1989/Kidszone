ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS correct_question_ids JSONB;

COMMENT ON COLUMN quiz_attempts.correct_question_ids IS
  'Question ids answered correctly in a quiz attempt. Used to avoid repeating mastered questions.';
