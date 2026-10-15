CREATE TABLE IF NOT EXISTS public.october_hadith_quiz_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
  age integer NOT NULL CHECK (age BETWEEN 3 AND 18),
  madrasah text NOT NULL CHECK (length(trim(madrasah)) BETWEEN 1 AND 120),
  city text NOT NULL CHECK (length(trim(city)) BETWEEN 1 AND 100),
  answers jsonb NOT NULL,
  question_marks integer[] CHECK (
    question_marks IS NULL OR (
      cardinality(question_marks) = 10
      AND 0 <= ALL(question_marks)
      AND 10 >= ALL(question_marks)
    )
  ),
  marks_total integer CHECK (marks_total IS NULL OR marks_total BETWEEN 0 AND 100),
  result text NOT NULL DEFAULT 'pending_review'
    CHECK (result IN ('pending_review', 'pass', 'failed')),
  admin_notes text NOT NULL DEFAULT '' CHECK (length(admin_notes) <= 2000),
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS october_hadith_quiz_submissions_review_idx
  ON public.october_hadith_quiz_submissions (result, submitted_at DESC);

ALTER TABLE public.october_hadith_quiz_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.october_hadith_quiz_submissions FROM anon, authenticated;
GRANT ALL ON TABLE public.october_hadith_quiz_submissions TO service_role;
