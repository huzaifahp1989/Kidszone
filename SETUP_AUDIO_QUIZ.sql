-- Audio Quiz (Kids Zone) — listen to an audio question, record a voice answer.
-- Safe to run multiple times.

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

create table if not exists public.audio_submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.audio_quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  user_name text,
  age integer,
  audio_path text not null,
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

create index if not exists audio_submissions_quiz_idx
  on public.audio_submissions (quiz_id, status, submitted_at desc);

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
alter table public.audio_submissions enable row level security;
alter table public.audio_quiz_winners enable row level security;

-- Quizzes: anyone may read; only service role writes.
drop policy if exists "Anyone can read audio quizzes" on public.audio_quizzes;
create policy "Anyone can read audio quizzes"
  on public.audio_quizzes for select using (true);

-- Submissions: a child can read/insert only their own (writes normally via service role).
drop policy if exists "Users read own audio submissions" on public.audio_submissions;
create policy "Users read own audio submissions"
  on public.audio_submissions for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users insert own audio submissions" on public.audio_submissions;
create policy "Users insert own audio submissions"
  on public.audio_submissions for insert to authenticated with check (auth.uid() = user_id);

-- Winners: anyone may read (results page).
drop policy if exists "Anyone can read audio quiz winners" on public.audio_quiz_winners;
create policy "Anyone can read audio quiz winners"
  on public.audio_quiz_winners for select using (true);

grant select on public.audio_quizzes to anon, authenticated;
grant select, insert on public.audio_submissions to authenticated;
grant select on public.audio_quiz_winners to anon, authenticated;
grant all on public.audio_quizzes to service_role;
grant all on public.audio_submissions to service_role;
grant all on public.audio_quiz_winners to service_role;

-- Ask PostgREST (the Supabase REST layer) to reload so the new tables are visible immediately.
notify pgrst, 'reload schema';
