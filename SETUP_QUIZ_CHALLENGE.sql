-- Islamic Quiz Challenge (Kids Zone)
-- Creates the tables for admin-managed questions, one-attempt scoring, and the leaderboard.
-- Safe to run multiple times.

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

-- Questions: anyone may read active questions; only the service role may write.
drop policy if exists "Anyone can read challenge questions" on public.challenge_quiz_questions;
create policy "Anyone can read challenge questions"
  on public.challenge_quiz_questions for select
  using (true);

-- Attempts: a child can read/insert only their own attempt (writes normally go via service role).
drop policy if exists "Users read own challenge attempts" on public.challenge_quiz_attempts;
create policy "Users read own challenge attempts"
  on public.challenge_quiz_attempts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own challenge attempts" on public.challenge_quiz_attempts;
create policy "Users insert own challenge attempts"
  on public.challenge_quiz_attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select on public.challenge_quiz_questions to anon, authenticated;
grant select, insert on public.challenge_quiz_attempts to authenticated;
grant all on public.challenge_quiz_questions to service_role;
grant all on public.challenge_quiz_attempts to service_role;

-- Ask PostgREST (the Supabase REST layer) to reload so the new tables are visible immediately.
notify pgrst, 'reload schema';
