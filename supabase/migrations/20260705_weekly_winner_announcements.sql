-- Manual weekly winner announcements (name + madrasah + week date)

create table if not exists public.weekly_winner_announcements (
  id uuid primary key default gen_random_uuid(),
  winner_name text not null check (char_length(trim(winner_name)) > 0),
  madrasah_name text,
  week_start_date date not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists weekly_winner_announcements_week_idx
  on public.weekly_winner_announcements (week_start_date desc, created_at desc);

alter table public.weekly_winner_announcements enable row level security;

drop policy if exists "Anyone can view weekly winner announcements" on public.weekly_winner_announcements;
create policy "Anyone can view weekly winner announcements"
  on public.weekly_winner_announcements for select
  to authenticated, anon
  using (true);

drop policy if exists "Service role manages weekly winner announcements" on public.weekly_winner_announcements;
create policy "Service role manages weekly winner announcements"
  on public.weekly_winner_announcements for all
  to service_role
  using (true)
  with check (true);

grant select on public.weekly_winner_announcements to authenticated, anon;
grant all on public.weekly_winner_announcements to service_role;
