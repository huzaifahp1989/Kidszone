-- Daily login streak engine (7-day ladder, welcome-back bonus, streak repair)
-- and the weekly quest board (per-quest claims + end-of-week chest).
-- Safe to re-run. Use `set check_function_bodies = false` for Supabase pgsql compatibility.

set check_function_bodies = off;

-- Streak state: one row per learner.
do $$ begin
  create table if not exists public.daily_streak_state (
    user_id uuid primary key references auth.users(id) on delete cascade,
    current_streak int not null default 0 check (current_streak >= 0),
    longest_streak int not null default 0 check (longest_streak >= 0),
    total_claims int not null default 0 check (total_claims >= 0),
    last_claim_date date,
    last_repair_date date,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
  );
exception when duplicate_table then null;
end $$;

-- One row per claimed day: which ladder step was taken and whether it followed a break.
do $$ begin
  create table if not exists public.daily_streak_claims (
    user_id uuid not null references auth.users(id) on delete cascade,
    claim_date date not null,
    day_index int not null check (day_index between 1 and 7),
    points int not null default 0 check (points >= 0),
    kind text not null default 'ladder' check (kind in ('ladder', 'comeback', 'repair')),
    created_at timestamptz not null default timezone('utc'::text, now()),
    primary key (user_id, claim_date)
  );
exception when duplicate_table then null;
end $$;

create index if not exists daily_streak_claims_user_date_idx
  on public.daily_streak_claims (user_id, claim_date desc);

do $$ begin alter table public.daily_streak_state enable row level security; exception when others then null; end $$;
do $$ begin alter table public.daily_streak_claims enable row level security; exception when others then null; end $$;

drop policy if exists "Users can view their own daily streak state" on public.daily_streak_state;
create policy "Users can view their own daily streak state"
  on public.daily_streak_state
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own daily streak claims" on public.daily_streak_claims;
create policy "Users can view their own daily streak claims"
  on public.daily_streak_claims
  for select
  to authenticated
  using (auth.uid() = user_id);

do $$ begin
  grant select on public.daily_streak_state to authenticated;
  grant select on public.daily_streak_claims to authenticated;
  grant all on public.daily_streak_state to service_role;
  grant all on public.daily_streak_claims to service_role;
exception when insufficient_privilege then null;
end $$;

-- Weekly quests: one claim row per quest the learner has completed and banked.
do $$ begin
  create table if not exists public.weekly_quest_claims (
    user_id uuid not null references auth.users(id) on delete cascade,
    week_start_date date not null,
    quest_key text not null,
    points_awarded int not null default 0 check (points_awarded >= 0),
    claimed_at timestamptz not null default timezone('utc'::text, now()),
    primary key (user_id, week_start_date, quest_key)
  );
exception when duplicate_table then null;
end $$;

create index if not exists weekly_quest_claims_user_week_idx
  on public.weekly_quest_claims (user_id, week_start_date desc);

-- End-of-week chest, unlocked once every quest for that week has been banked.
do $$ begin
  create table if not exists public.weekly_quest_chest_claims (
    user_id uuid not null references auth.users(id) on delete cascade,
    week_start_date date not null,
    points_awarded int not null default 0 check (points_awarded >= 0),
    badge_name text,
    claimed_at timestamptz not null default timezone('utc'::text, now()),
    primary key (user_id, week_start_date)
  );
exception when duplicate_table then null;
end $$;

do $$ begin alter table public.weekly_quest_claims enable row level security; exception when others then null; end $$;
do $$ begin alter table public.weekly_quest_chest_claims enable row level security; exception when others then null; end $$;

drop policy if exists "Users can view their own weekly quest claims" on public.weekly_quest_claims;
create policy "Users can view their own weekly quest claims"
  on public.weekly_quest_claims
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own weekly quest chest" on public.weekly_quest_chest_claims;
create policy "Users can view their own weekly quest chest"
  on public.weekly_quest_chest_claims
  for select
  to authenticated
  using (auth.uid() = user_id);

do $$ begin
  grant select on public.weekly_quest_claims to authenticated;
  grant select on public.weekly_quest_chest_claims to authenticated;
  grant all on public.weekly_quest_claims to service_role;
  grant all on public.weekly_quest_chest_claims to service_role;
exception when insufficient_privilege then null;
end $$;
