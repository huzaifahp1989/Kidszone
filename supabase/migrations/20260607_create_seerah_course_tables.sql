create table if not exists public.seerah_quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text,
  email text,
  chapter_number int not null check (chapter_number between 1 and 5),
  answers jsonb not null,
  auto_marks int[] not null default '{}',
  manual_marks int[],
  auto_score int not null default 0,
  final_score int not null default 0,
  status text not null default 'needs_improvement' check (status in ('passed', 'needs_improvement')),
  admin_notes text,
  submitted_at timestamptz not null default timezone('utc'::text, now()),
  reviewed_at timestamptz,
  unique (user_id, chapter_number)
);

create table if not exists public.seerah_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  user_name text,
  email text,
  issued_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.seerah_quiz_submissions enable row level security;
alter table public.seerah_certificates enable row level security;

drop policy if exists "Users can read own seerah submissions" on public.seerah_quiz_submissions;
create policy "Users can read own seerah submissions"
  on public.seerah_quiz_submissions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own seerah submissions" on public.seerah_quiz_submissions;
create policy "Users can insert own seerah submissions"
  on public.seerah_quiz_submissions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own seerah certificates" on public.seerah_certificates;
create policy "Users can read own seerah certificates"
  on public.seerah_certificates for select
  to authenticated
  using (auth.uid() = user_id);

grant select, insert on public.seerah_quiz_submissions to authenticated;
grant select on public.seerah_certificates to authenticated;
grant all on public.seerah_quiz_submissions to service_role;
grant all on public.seerah_certificates to service_role;
