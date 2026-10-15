-- Run this in the Supabase SQL editor if automatic setup is unavailable.
-- Then open /admin/written-competitions and click "Create Rabi ul Awwal quiz" if needed.

-- Written-answer competitions (reusable: Rabi ul Awwal Seerah, Ramadan, Qur'an, Hadith, etc.)
-- Kids type their own answers. Admin marks by hand. No auto-grading.

CREATE TABLE IF NOT EXISTS public.written_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'seerah',
  rules text NOT NULL DEFAULT '',
  prize_information text NOT NULL DEFAULT '',
  start_date timestamptz,
  closing_date timestamptz,
  winner_announcement_date timestamptz,
  question_count integer NOT NULL DEFAULT 10,
  max_answer_length integer NOT NULL DEFAULT 2000 CHECK (max_answer_length BETWEEN 200 AND 8000),
  min_age integer CHECK (min_age IS NULL OR min_age BETWEEN 1 AND 120),
  max_attempts integer NOT NULL DEFAULT 1 CHECK (max_attempts BETWEEN 1 AND 5),
  min_score_required integer NOT NULL DEFAULT 0,
  winners_count integer NOT NULL DEFAULT 1 CHECK (winners_count BETWEEN 1 AND 50),
  show_winners_publicly boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS written_competitions_active_idx
  ON public.written_competitions (active, closing_date);

CREATE TABLE IF NOT EXISTS public.written_competition_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.written_competitions (id) ON DELETE CASCADE,
  question_number integer NOT NULL CHECK (question_number >= 1),
  question_text text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('medium', 'challenging', 'advanced')),
  topic text NOT NULL DEFAULT '',
  expected_answer text NOT NULL DEFAULT '',
  marking_guidance text NOT NULL DEFAULT '',
  max_marks integer NOT NULL DEFAULT 10 CHECK (max_marks BETWEEN 1 AND 100),
  min_required_points integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (competition_id, question_number)
);

CREATE INDEX IF NOT EXISTS written_competition_questions_comp_idx
  ON public.written_competition_questions (competition_id, question_number);

CREATE TABLE IF NOT EXISTS public.written_competition_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.written_competitions (id) ON DELETE CASCADE,
  prize_name text NOT NULL,
  prize_description text NOT NULL DEFAULT '',
  prize_image_url text,
  prize_image_path text,
  sponsor text NOT NULL DEFAULT '',
  sponsor_logo_url text,
  winners_count integer NOT NULL DEFAULT 1 CHECK (winners_count BETWEEN 1 AND 20),
  prize_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS written_competition_prizes_comp_idx
  ON public.written_competition_prizes (competition_id, prize_order);

CREATE TABLE IF NOT EXISTS public.written_competition_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.written_competitions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  age integer,
  contact_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending_review' CHECK (
    status IN (
      'pending_review',
      'under_review',
      'reviewed',
      'approved',
      'rejected',
      'eligible',
      'winner'
    )
  ),
  total_marks integer NOT NULL DEFAULT 0,
  max_marks integer NOT NULL DEFAULT 0,
  percentage integer NOT NULL DEFAULT 0,
  admin_notes text NOT NULL DEFAULT '',
  reviewed_by text,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (competition_id, user_id)
);

CREATE INDEX IF NOT EXISTS written_competition_submissions_status_idx
  ON public.written_competition_submissions (competition_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS written_competition_submissions_user_idx
  ON public.written_competition_submissions (user_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.written_competition_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.written_competition_submissions (id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.written_competition_questions (id) ON DELETE RESTRICT,
  question_number integer NOT NULL,
  question_text text NOT NULL DEFAULT '',
  answer_text text NOT NULL DEFAULT '',
  max_marks integer NOT NULL DEFAULT 10,
  marks_awarded integer,
  admin_feedback text NOT NULL DEFAULT '',
  judged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS written_competition_answers_submission_idx
  ON public.written_competition_answers (submission_id, question_number);

CREATE TABLE IF NOT EXISTS public.written_competition_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.written_competitions (id) ON DELETE CASCADE,
  prize_id uuid REFERENCES public.written_competition_prizes (id) ON DELETE SET NULL,
  submission_id uuid NOT NULL REFERENCES public.written_competition_submissions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'awaiting_verification' CHECK (
    status IN ('awaiting_verification', 'confirmed', 'disqualified')
  ),
  disqualify_reason text NOT NULL DEFAULT '',
  public_display boolean NOT NULL DEFAULT false,
  selected_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  confirmed_at timestamptz,
  confirmed_by text,
  UNIQUE (competition_id, submission_id)
);

CREATE INDEX IF NOT EXISTS written_competition_winners_comp_idx
  ON public.written_competition_winners (competition_id, status);

ALTER TABLE public.written_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.written_competition_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.written_competition_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.written_competition_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.written_competition_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.written_competition_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read written competitions" ON public.written_competitions;
CREATE POLICY "Anyone can read written competitions"
  ON public.written_competitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read written prizes" ON public.written_competition_prizes;
CREATE POLICY "Anyone can read written prizes"
  ON public.written_competition_prizes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read confirmed written winners" ON public.written_competition_winners;
CREATE POLICY "Anyone can read confirmed written winners"
  ON public.written_competition_winners FOR SELECT
  USING (status = 'confirmed' AND public_display = true);

DROP POLICY IF EXISTS "Users read own written submissions" ON public.written_competition_submissions;
CREATE POLICY "Users read own written submissions"
  ON public.written_competition_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own written submissions" ON public.written_competition_submissions;
CREATE POLICY "Users insert own written submissions"
  ON public.written_competition_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own written answers" ON public.written_competition_answers;
CREATE POLICY "Users read own written answers"
  ON public.written_competition_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.written_competition_submissions s
      WHERE s.id = submission_id AND s.user_id = auth.uid()
    )
  );

-- Questions are served via service role so expected answers / marking guides stay admin-only.

GRANT SELECT ON public.written_competitions TO anon, authenticated;
GRANT SELECT ON public.written_competition_prizes TO anon, authenticated;
GRANT SELECT ON public.written_competition_winners TO anon, authenticated;
GRANT SELECT, INSERT ON public.written_competition_submissions TO authenticated;
GRANT SELECT, INSERT ON public.written_competition_answers TO authenticated;

GRANT ALL ON public.written_competitions TO service_role;
GRANT ALL ON public.written_competition_questions TO service_role;
GRANT ALL ON public.written_competition_prizes TO service_role;
GRANT ALL ON public.written_competition_submissions TO service_role;
GRANT ALL ON public.written_competition_answers TO service_role;
GRANT ALL ON public.written_competition_winners TO service_role;

NOTIFY pgrst, 'reload schema';
