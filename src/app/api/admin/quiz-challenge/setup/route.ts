import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { CHALLENGE_QUIZ_KEYS, CHALLENGE_QUIZZES } from '@/data/challenge-quizzes';
import { CHALLENGE_QUESTIONS_TABLE, isMissingTableError } from '@/lib/challenge-quiz-server';

export const dynamic = 'force-dynamic';

const SETUP_SQL = `
create table if not exists public.challenge_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_key text not null check (quiz_key in ('quran-stories', 'fiqh')),
  prompt text not null,
  answer text not null,
  accepted_answers text[] not null default '{}',
  explanation text,
  is_bonus boolean not null default false,
  points integer not null default 1,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists challenge_quiz_questions_quiz_idx
  on public.challenge_quiz_questions (quiz_key, sort_order);

create table if not exists public.challenge_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_key text not null check (quiz_key in ('quran-stories', 'fiqh')),
  user_name text,
  email text,
  score integer not null default 0,
  total integer not null default 0,
  bonus_score integer not null default 0,
  bonus_total integer not null default 0,
  passed boolean not null default false,
  awarded_badge boolean not null default false,
  auto_submitted boolean not null default false,
  duration_seconds integer,
  answers jsonb not null default '[]',
  completed_at timestamptz not null default timezone('utc', now()),
  unique (user_id, quiz_key)
);

create index if not exists challenge_quiz_attempts_leaderboard_idx
  on public.challenge_quiz_attempts (quiz_key, score desc, bonus_score desc, completed_at asc);

alter table public.challenge_quiz_questions enable row level security;
alter table public.challenge_quiz_attempts enable row level security;

drop policy if exists "Anyone can read challenge questions" on public.challenge_quiz_questions;
create policy "Anyone can read challenge questions"
  on public.challenge_quiz_questions for select using (true);

drop policy if exists "Users read own challenge attempts" on public.challenge_quiz_attempts;
create policy "Users read own challenge attempts"
  on public.challenge_quiz_attempts for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users insert own challenge attempts" on public.challenge_quiz_attempts;
create policy "Users insert own challenge attempts"
  on public.challenge_quiz_attempts for insert to authenticated with check (auth.uid() = user_id);

grant select on public.challenge_quiz_questions to anon, authenticated;
grant select, insert on public.challenge_quiz_attempts to authenticated;
grant all on public.challenge_quiz_questions to service_role;
grant all on public.challenge_quiz_attempts to service_role;

-- Ask PostgREST (the Supabase REST layer) to reload so the new tables are visible immediately.
notify pgrst, 'reload schema';
`.trim();

/** Insert the built-in authentic questions so admins can edit them right away. */
async function seedDefaultQuestions(): Promise<number> {
  let inserted = 0;
  for (const key of CHALLENGE_QUIZ_KEYS) {
    const { count, error: countError } = await supabaseAdmin
      .from(CHALLENGE_QUESTIONS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('quiz_key', key);
    if (countError || (count ?? 0) > 0) continue;

    const rows = CHALLENGE_QUIZZES[key].questions.map((q, index) => ({
      quiz_key: key,
      prompt: q.prompt,
      answer: q.answer,
      accepted_answers: q.acceptedAnswers,
      explanation: q.explanation,
      is_bonus: q.isBonus,
      points: q.points,
      sort_order: index,
      active: true,
    }));
    const { error: insertError } = await supabaseAdmin.from(CHALLENGE_QUESTIONS_TABLE).insert(rows);
    if (!insertError) inserted += rows.length;
  }
  return inserted;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { error } = await supabaseAdmin.from(CHALLENGE_QUESTIONS_TABLE).select('id').limit(1);
  if (isMissingTableError(error)) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: !error });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Try to create the tables automatically via the exec_sql RPC.
  const { error: rpcError } = await supabaseAdmin.rpc('exec_sql', { sql: SETUP_SQL });

  // Give PostgREST a moment to reload its schema cache after the DDL above.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Verify the table now exists regardless of the RPC result (it may already exist).
  const { error: checkError } = await supabaseAdmin.from(CHALLENGE_QUESTIONS_TABLE).select('id').limit(1);

  if (isMissingTableError(checkError)) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Automatic setup is not available on this database (the exec_sql helper is missing). Please copy the SQL below and run it once in the Supabase SQL editor, then reopen this page.',
        sql: SETUP_SQL,
        rpcError: rpcError?.message || null,
      },
      { status: 503 }
    );
  }

  const seeded = await seedDefaultQuestions();
  return NextResponse.json({ success: true, message: 'Quiz Challenge tables are ready.', seeded });
}
