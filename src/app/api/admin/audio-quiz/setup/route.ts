import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { AUDIO_QUIZZES_TABLE, isMissingTableError, seedTestAudioQuiz } from '@/lib/audio-quiz-server';

export const dynamic = 'force-dynamic';

const SETUP_SQL = `
create table if not exists public.audio_quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'General Knowledge',
  age_group text not null default 'All ages',
  start_date date,
  end_date date,
  prize_details text,
  max_recording_seconds integer not null default 60 check (max_recording_seconds between 30 and 90),
  question_audio_path text,
  question_audio_url text,
  banner_url text,
  winners_count integer not null default 3,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists audio_quizzes_active_idx on public.audio_quizzes (active, end_date);

create table if not exists public.audio_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.audio_quizzes (id) on delete cascade,
  sort_order integer not null default 0,
  prompt text,
  audio_path text,
  audio_url text,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists audio_quiz_questions_quiz_idx on public.audio_quiz_questions (quiz_id, sort_order);

create table if not exists public.audio_submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.audio_quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  user_name text,
  age integer,
  audio_path text,
  audio_url text,
  duration_seconds integer not null default 0,
  device_info text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  place integer,
  judge_notes text,
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  unique (quiz_id, user_id)
);
create index if not exists audio_submissions_quiz_idx on public.audio_submissions (quiz_id, status, submitted_at desc);
alter table public.audio_submissions alter column audio_path drop not null;

create table if not exists public.audio_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.audio_submissions (id) on delete cascade,
  quiz_id uuid not null references public.audio_quizzes (id) on delete cascade,
  question_id uuid not null references public.audio_quiz_questions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  audio_path text not null,
  audio_url text,
  duration_seconds integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (submission_id, question_id)
);
create index if not exists audio_answers_submission_idx on public.audio_answers (submission_id);
create index if not exists audio_answers_question_idx on public.audio_answers (question_id);

create table if not exists public.audio_quiz_winners (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.audio_quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  user_name text,
  place integer not null check (place between 1 and 10),
  created_at timestamptz not null default timezone('utc', now()),
  unique (quiz_id, place)
);

alter table public.audio_quizzes enable row level security;
alter table public.audio_quiz_questions enable row level security;
alter table public.audio_submissions enable row level security;
alter table public.audio_answers enable row level security;
alter table public.audio_quiz_winners enable row level security;

drop policy if exists "Anyone can read audio quizzes" on public.audio_quizzes;
create policy "Anyone can read audio quizzes" on public.audio_quizzes for select using (true);
drop policy if exists "Anyone can read audio quiz questions" on public.audio_quiz_questions;
create policy "Anyone can read audio quiz questions" on public.audio_quiz_questions for select using (true);
drop policy if exists "Users read own audio submissions" on public.audio_submissions;
create policy "Users read own audio submissions" on public.audio_submissions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users insert own audio submissions" on public.audio_submissions;
create policy "Users insert own audio submissions" on public.audio_submissions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users read own audio answers" on public.audio_answers;
create policy "Users read own audio answers" on public.audio_answers for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users insert own audio answers" on public.audio_answers;
create policy "Users insert own audio answers" on public.audio_answers for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Anyone can read audio quiz winners" on public.audio_quiz_winners;
create policy "Anyone can read audio quiz winners" on public.audio_quiz_winners for select using (true);

grant select on public.audio_quizzes to anon, authenticated;
grant select on public.audio_quiz_questions to anon, authenticated;
grant select, insert on public.audio_submissions to authenticated;
grant select, insert on public.audio_answers to authenticated;
grant select on public.audio_quiz_winners to anon, authenticated;
grant all on public.audio_quizzes to service_role;
grant all on public.audio_quiz_questions to service_role;
grant all on public.audio_submissions to service_role;
grant all on public.audio_answers to service_role;
grant all on public.audio_quiz_winners to service_role;

notify pgrst, 'reload schema';
`.trim();

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabaseAdmin.from(AUDIO_QUIZZES_TABLE).select('id').limit(1);
  if (isMissingTableError(error)) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: !error });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error: rpcError } = await supabaseAdmin.rpc('exec_sql', { sql: SETUP_SQL });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const { error: checkError } = await supabaseAdmin.from(AUDIO_QUIZZES_TABLE).select('id').limit(1);

  if (isMissingTableError(checkError)) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Automatic setup is not available on this database (the exec_sql helper is missing). Please run SETUP_AUDIO_QUIZ.sql in the Supabase SQL editor, then reopen this page.',
        sql: SETUP_SQL,
        rpcError: rpcError?.message || null,
      },
      { status: 503 }
    );
  }

  const seeded = await seedTestAudioQuiz().catch(() => null);

  return NextResponse.json({
    success: true,
    message: seeded?.created
      ? 'Audio Quiz tables are ready. A test quiz with sample audio was added.'
      : 'Audio Quiz tables are ready.',
    testQuizId: seeded?.quizId ?? null,
  });
}
