-- Weekly participation certificates for the top most-active/highest-points learners each week.
-- Safe to re-run.

create table if not exists public.weekly_certificates (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  rank int not null check (rank >= 1),
  tier text not null check (tier in ('gold','silver','bronze','participation')),
  weekly_points int not null default 0 check (weekly_points >= 0),
  weekly_activity_count int not null default 0 check (weekly_activity_count >= 0),
  weekly_score int not null default 0 check (weekly_score >= 0),
  badges_at_award int not null default 0 check (badges_at_award >= 0),
  level_at_award int not null default 1 check (level_at_award >= 1),
  issued_by text,
  issued_at timestamptz not null default timezone('utc'::text, now()),
  unique (week_start_date, user_id)
);

create index if not exists weekly_certificates_user_idx
  on public.weekly_certificates (user_id, week_start_date desc);

create index if not exists weekly_certificates_week_idx
  on public.weekly_certificates (week_start_date desc, rank asc);

alter table public.weekly_certificates enable row level security;

drop policy if exists "Users can view their own weekly certificates" on public.weekly_certificates;
create policy "Users can view their own weekly certificates"
  on public.weekly_certificates
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins can insert weekly certificates via service_role only" on public.weekly_certificates;
create policy "Admins can insert weekly certificates via service_role only"
  on public.weekly_certificates
  for insert
  to service_role
  with check (true);

grant select on public.weekly_certificates to authenticated;
grant select, insert on public.weekly_certificates to service_role;

-- Optional: bump badges count for each new cert (best-effort via stored helper idempotent via app).
