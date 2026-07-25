-- Session topic quizzes insert many synthetic daily_quizzes rows (one per attempt).
-- UNIQUE(quiz_date) caused insert collisions → retry storms → clients stuck on
-- "Submitting your answers…" and points never awarded for those attempts.
-- Keep an index for day lookups; allow duplicate dates for session rows.

ALTER TABLE public.daily_quizzes
  DROP CONSTRAINT IF EXISTS daily_quizzes_quiz_date_key;

DROP INDEX IF EXISTS daily_quizzes_quiz_date_key;

CREATE INDEX IF NOT EXISTS daily_quizzes_quiz_date_idx
  ON public.daily_quizzes (quiz_date);
