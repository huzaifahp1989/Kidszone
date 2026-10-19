-- Link October Hadith Quiz submissions to the signed-in learner so a "Failed"
-- result can be delivered back to them as a retry popup and a push.

ALTER TABLE public.october_hadith_quiz_submissions
  ADD COLUMN IF NOT EXISTS uid uuid;

-- Set when the learner is told their submission failed, so the retry push is
-- only ever sent once per submission.
ALTER TABLE public.october_hadith_quiz_submissions
  ADD COLUMN IF NOT EXISTS retry_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS october_hadith_quiz_submissions_uid_idx
  ON public.october_hadith_quiz_submissions (uid, submitted_at DESC);
