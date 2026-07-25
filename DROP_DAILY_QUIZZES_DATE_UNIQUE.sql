-- ============================================================================
-- FIX: Quiz submit stuck / points not awarded
-- ============================================================================
-- Cause: topic quiz sessions insert one daily_quizzes row per attempt.
-- UNIQUE(quiz_date) collisions caused insert retry storms so clients hung on
-- "Submitting your answers…" and never reached points award.
--
-- Run once in Supabase → SQL Editor, then redeploy the app if needed.
-- ============================================================================

ALTER TABLE public.daily_quizzes
  DROP CONSTRAINT IF EXISTS daily_quizzes_quiz_date_key;

DROP INDEX IF EXISTS daily_quizzes_quiz_date_key;

CREATE INDEX IF NOT EXISTS daily_quizzes_quiz_date_idx
  ON public.daily_quizzes (quiz_date);

-- Verify: both inserts should succeed (then delete the probe rows).
-- INSERT INTO public.daily_quizzes (id, quiz_date, question_ids, is_published)
-- VALUES
--   (gen_random_uuid(), '2099-01-15', '["probe-a"]'::jsonb, false),
--   (gen_random_uuid(), '2099-01-15', '["probe-b"]'::jsonb, false);
