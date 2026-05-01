create table if not exists public.referral_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  referral_code text not null unique,
  tokens_earned integer not null default 0,
  successful_joins integer not null default 0,
  shares_count integer not null default 0,
  points_earned integer not null default 0,
  last_share_reward_date date,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code text not null,
  tokens_awarded integer not null default 0,
  points_awarded integer not null default 0,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.referral_share_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_date date not null,
  tokens_awarded integer not null default 0,
  points_awarded integer not null default 0,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique (user_id, reward_date)
);

create index if not exists idx_referral_profiles_code on public.referral_profiles(referral_code);
create index if not exists idx_referral_events_referrer on public.referral_events(referrer_user_id);
create index if not exists idx_referral_share_rewards_user on public.referral_share_rewards(user_id);

create or replace function public.touch_referral_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_referral_profiles_updated_at on public.referral_profiles;
create trigger trg_referral_profiles_updated_at
before update on public.referral_profiles
for each row execute function public.touch_referral_profiles_updated_at();

alter table public.referral_profiles enable row level security;
alter table public.referral_events enable row level security;
alter table public.referral_share_rewards enable row level security;

drop policy if exists "Users can read own referral profile" on public.referral_profiles;
create policy "Users can read own referral profile"
  on public.referral_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own referral profile" on public.referral_profiles;
create policy "Users can create own referral profile"
  on public.referral_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own referral profile" on public.referral_profiles;
create policy "Users can update own referral profile"
  on public.referral_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read referral events" on public.referral_events;
create policy "Users can read referral events"
  on public.referral_events for select
  using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

drop policy if exists "Users can insert own referral join event" on public.referral_events;
create policy "Users can insert own referral join event"
  on public.referral_events for insert
  with check (auth.uid() = referred_user_id);

drop policy if exists "Users can read own share rewards" on public.referral_share_rewards;
create policy "Users can read own share rewards"
  on public.referral_share_rewards for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own share rewards" on public.referral_share_rewards;
create policy "Users can insert own share rewards"
  on public.referral_share_rewards for insert
  with check (auth.uid() = user_id);

grant all on table public.referral_profiles to authenticated;
grant all on table public.referral_events to authenticated;
grant all on table public.referral_share_rewards to authenticated;
