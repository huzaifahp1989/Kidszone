-- Optional: add a test Audio Quiz with sample question audio (safe to re-run).
-- Run after SETUP_AUDIO_QUIZ.sql.

insert into public.audio_quizzes (
  title,
  description,
  category,
  age_group,
  prize_details,
  max_recording_seconds,
  winners_count,
  active
)
select
  'Test Audio Quiz',
  'A sample audio quiz so you can try listening and recording an answer. Safe to delete after testing.',
  'General Knowledge',
  'All ages',
  'Test prize — bragging rights only!',
  60,
  3,
  true
where not exists (
  select 1 from public.audio_quizzes where title = 'Test Audio Quiz'
);

insert into public.audio_quiz_questions (
  quiz_id,
  prompt,
  audio_url,
  sort_order
)
select
  q.id,
  'Listen to the sound, then record your answer: what animal does this remind you of?',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
  0
from public.audio_quizzes q
where q.title = 'Test Audio Quiz'
  and not exists (
    select 1 from public.audio_quiz_questions where quiz_id = q.id
  );

notify pgrst, 'reload schema';
