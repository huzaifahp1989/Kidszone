-- Auto weekly winner automation (run after SETUP_WEEKLY_WINNER_ANNOUNCEMENTS.sql)

alter table public.weekly_winner_announcements
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create table if not exists public.weekly_winner_pick_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  weekly_score integer not null default 0,
  weekly_points integer not null default 0,
  is_new_signup boolean not null default false,
  picked_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, week_start_date)
);

create index if not exists weekly_winner_pick_log_week_idx
  on public.weekly_winner_pick_log (week_start_date desc);

alter table public.weekly_winner_pick_log enable row level security;

drop policy if exists "Anyone can view weekly winner pick log" on public.weekly_winner_pick_log;
create policy "Anyone can view weekly winner pick log"
  on public.weekly_winner_pick_log for select
  to authenticated, anon
  using (true);

drop policy if exists "Service role manages weekly winner pick log" on public.weekly_winner_pick_log;
create policy "Service role manages weekly winner pick log"
  on public.weekly_winner_pick_log for all
  to service_role
  using (true)
  with check (true);

grant select on public.weekly_winner_pick_log to authenticated, anon;
grant all on public.weekly_winner_pick_log to service_role;

alter table public.featured_winners
  add column if not exists week_start_date date;
