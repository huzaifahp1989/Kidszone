-- Run in Supabase SQL editor to enable Kids Sadaqah / Donations + leaderboard

create table if not exists public.kids_donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  donation_type text not null check (donation_type in ('money', 'food', 'clothes', 'toys', 'help', 'other')),
  amount_pence integer not null default 0 check (amount_pence >= 0),
  description text not null,
  stripe_checkout_session_id text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists kids_donations_stripe_session_uidx
  on public.kids_donations (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists kids_donations_user_created_idx
  on public.kids_donations (user_id, created_at desc);

create index if not exists kids_donations_created_idx
  on public.kids_donations (created_at desc);

alter table public.kids_donations enable row level security;

drop policy if exists "Users can view own donations" on public.kids_donations;
create policy "Users can view own donations"
  on public.kids_donations for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Anyone can view donation leaderboard totals" on public.kids_donations;
create policy "Anyone can view donation leaderboard totals"
  on public.kids_donations for select
  to authenticated, anon
  using (true);

drop policy if exists "Users can insert own donations" on public.kids_donations;
create policy "Users can insert own donations"
  on public.kids_donations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Service role manages kids donations" on public.kids_donations;
create policy "Service role manages kids donations"
  on public.kids_donations for all
  to service_role
  using (true)
  with check (true);

grant select, insert on public.kids_donations to authenticated;
grant select on public.kids_donations to anon;
grant all on public.kids_donations to service_role;
