-- ============================================================
-- AUG 2026 ISLAMIC MIXED QUIZ — MANUAL ADMIN REVIEW
-- Safe / re-runnable. Applies:
--   1) Extends challenge_quiz tables CHECK constraints with the new
--      'aug-2026-mixed' quiz_key so existing setup still works.
--   2) Creates a brand new pair of tables for MANUAL-REVIEW submissions:
--        manual_quiz_submissions  (one row per kid / submission)
--        manual_quiz_answers      (one row per question answered — admin
--                                 judges every answer and awards points).
-- ============================================================

-- -------- 1. Allow the new quiz key in existing challenge quiz tables --------
-- Note: PostgreSQL does not allow "ALTER CONSTRAINT" so we drop + recreate.
-- We use DO blocks so this is safe on any schema state.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname='challenge_quiz_questions'
      AND c.conname='challenge_quiz_questions_quiz_key_check'
  ) THEN
    ALTER TABLE public.challenge_quiz_questions
      DROP CONSTRAINT challenge_quiz_questions_quiz_key_check;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='challenge_quiz_questions' AND column_name='quiz_key'
  ) THEN
    ALTER TABLE public.challenge_quiz_questions
      ADD CONSTRAINT challenge_quiz_questions_quiz_key_check
      CHECK (quiz_key IN ('quran-stories', 'fiqh', 'aug-2026-mixed'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname='challenge_quiz_attempts'
      AND c.conname='challenge_quiz_attempts_quiz_key_check'
  ) THEN
    ALTER TABLE public.challenge_quiz_attempts
      DROP CONSTRAINT challenge_quiz_attempts_quiz_key_check;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='challenge_quiz_attempts' AND column_name='quiz_key'
  ) THEN
    ALTER TABLE public.challenge_quiz_attempts
      ADD CONSTRAINT challenge_quiz_attempts_quiz_key_check
      CHECK (quiz_key IN ('quran-stories', 'fiqh', 'aug-2026-mixed'));
  END IF;
END $$;

-- -------- 2. Manual review submissions (one per kid) --------

CREATE TABLE IF NOT EXISTS public.manual_quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_key TEXT NOT NULL DEFAULT 'aug-2026-mixed'
    CHECK (quiz_key IN ('aug-2026-mixed')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  email TEXT,
  city TEXT,
  age INTEGER,
  contact_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  -- Total points the admin finally awarded across every answer.
  points_awarded INTEGER NOT NULL DEFAULT 0,
  max_points_available INTEGER NOT NULL DEFAULT 0,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  device_info TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  UNIQUE (user_id, quiz_key, submitted_at)
);

-- ---- Repair: if the table was created in a partial earlier run, ensure all
--      expected columns are present regardless of the CREATE TABLE IF NOT
--      EXISTS skip path above.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='manual_quiz_submissions' AND column_name='submitted_at'
  ) THEN
    ALTER TABLE public.manual_quiz_submissions
      ADD COLUMN submitted_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='manual_quiz_submissions' AND column_name='reviewed_by'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='manual_quiz_submissions' AND column_name='judged_by'
  ) THEN
    ALTER TABLE public.manual_quiz_submissions RENAME COLUMN judged_by TO reviewed_by;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='manual_quiz_submissions' AND column_name='reviewed_by'
  ) THEN
    ALTER TABLE public.manual_quiz_submissions
      ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='manual_quiz_submissions' AND column_name='reviewed_at'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='manual_quiz_submissions' AND column_name='judged_at'
  ) THEN
    ALTER TABLE public.manual_quiz_submissions RENAME COLUMN judged_at TO reviewed_at;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='manual_quiz_submissions' AND column_name='reviewed_at'
  ) THEN
    ALTER TABLE public.manual_quiz_submissions
      ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='manual_quiz_submissions' AND column_name='max_points_available'
  ) THEN
    ALTER TABLE public.manual_quiz_submissions
      ADD COLUMN max_points_available INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_manual_quiz_submissions_status_submitted
  ON public.manual_quiz_submissions (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_quiz_submissions_user
  ON public.manual_quiz_submissions (user_id, submitted_at DESC);

-- -------- 3. Manual review answers (one per judged question) --------

CREATE TABLE IF NOT EXISTS public.manual_quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL
    REFERENCES public.manual_quiz_submissions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_topic TEXT,
  question_prompt TEXT NOT NULL,
  reference_answer TEXT,
  -- Kid's typed text answer.
  answer_text TEXT NOT NULL,
  -- Admin per-question scoring.
  judge_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (judge_status IN ('pending', 'correct', 'partial', 'incorrect', 'skipped')),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  max_points INTEGER NOT NULL DEFAULT 0,
  judge_notes TEXT,
  judged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_manual_quiz_answers_submission
  ON public.manual_quiz_answers (submission_id);
CREATE INDEX IF NOT EXISTS idx_manual_quiz_answers_judge_status
  ON public.manual_quiz_answers (judge_status);

-- -------- 4. RLS --------

ALTER TABLE public.manual_quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own manual submissions" ON public.manual_quiz_submissions;
CREATE POLICY "Users read own manual submissions"
  ON public.manual_quiz_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own manual submissions" ON public.manual_quiz_submissions;
CREATE POLICY "Users insert own manual submissions"
  ON public.manual_quiz_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own manual answers" ON public.manual_quiz_answers;
CREATE POLICY "Users read own manual answers"
  ON public.manual_quiz_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manual_quiz_submissions s
      WHERE s.id = manual_quiz_answers.submission_id AND s.user_id = auth.uid()
    )
  );

-- Service role owns all writes (both sides).
GRANT SELECT, INSERT ON public.manual_quiz_submissions TO authenticated;
GRANT SELECT, INSERT ON public.manual_quiz_answers TO authenticated;
GRANT ALL ON public.manual_quiz_submissions TO service_role;
GRANT ALL ON public.manual_quiz_answers TO service_role;

-- -------- 5. Stronger uniqueness: one submission per (user, quiz) regardless of timestamp --------
-- Drop the timestamp-scoped UNIQUE constraint because it lets kids re-submit by waiting 1ms.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname='manual_quiz_submissions'
      AND c.conname='manual_quiz_submissions_user_id_quiz_key_submitted_at_key'
  ) THEN
    ALTER TABLE public.manual_quiz_submissions
      DROP CONSTRAINT manual_quiz_submissions_user_id_quiz_key_submitted_at_key;
  END IF;
END $$;

-- Create a proper per-(user, quiz) uniqueness guarantee so duplicates cannot
-- slip in even at the SQL layer, regardless of submitted_at.
CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_quiz_submissions_one_per_user
  ON public.manual_quiz_submissions (user_id, quiz_key);

NOTIFY pgrst, 'reload schema';
