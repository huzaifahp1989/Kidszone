import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { DEFAULT_FITNESS_CHALLENGES } from '@/lib/fitness';
import { FITNESS_CHALLENGES_TABLE, isMissingTableError } from '@/lib/fitness-server';

export const dynamic = 'force-dynamic';

const SETUP_SQL = `
create table if not exists public.fitness_challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  goal_type text not null default 'steps' check (goal_type in ('steps', 'minutes')),
  goal_target integer not null default 5000,
  points integer not null default 50,
  age_group text not null default 'All ages',
  active boolean not null default true,
  start_date date,
  end_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists fitness_challenges_active_idx on public.fitness_challenges (active);

create table if not exists public.daily_step_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_day date not null,
  steps integer not null default 0,
  minutes integer not null default 0,
  distance_m integer not null default 0,
  calories integer not null default 0,
  source text not null default 'unknown',
  challenge_id uuid references public.fitness_challenges (id) on delete set null,
  goal_met boolean not null default false,
  points_awarded integer not null default 0,
  flagged boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, activity_day)
);
create index if not exists daily_step_activity_day_idx on public.daily_step_activity (activity_day, steps desc);
create index if not exists daily_step_activity_user_idx on public.daily_step_activity (user_id, activity_day desc);

create table if not exists public.walking_rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  reward_type text not null default 'badge',
  description text,
  threshold integer,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fitness_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default timezone('utc', now()),
  unique (user_id, badge_key)
);
create index if not exists fitness_badges_user_idx on public.fitness_badges (user_id);

create table if not exists public.fitness_leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,
  period_key text not null,
  steps integer not null default 0,
  minutes integer not null default 0,
  points integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, period, period_key)
);

alter table public.fitness_challenges enable row level security;
alter table public.daily_step_activity enable row level security;
alter table public.walking_rewards enable row level security;
alter table public.fitness_badges enable row level security;
alter table public.fitness_leaderboard enable row level security;

drop policy if exists "Anyone can read fitness challenges" on public.fitness_challenges;
create policy "Anyone can read fitness challenges" on public.fitness_challenges for select using (true);
drop policy if exists "Anyone can read walking rewards" on public.walking_rewards;
create policy "Anyone can read walking rewards" on public.walking_rewards for select using (true);
drop policy if exists "Users read own step activity" on public.daily_step_activity;
create policy "Users read own step activity" on public.daily_step_activity for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users read own fitness badges" on public.fitness_badges;
create policy "Users read own fitness badges" on public.fitness_badges for select to authenticated using (auth.uid() = user_id);

grant select on public.fitness_challenges to anon, authenticated;
grant select on public.walking_rewards to anon, authenticated;
grant select on public.daily_step_activity to authenticated;
grant select on public.fitness_badges to authenticated;
grant select on public.fitness_leaderboard to anon, authenticated;
grant all on public.fitness_challenges to service_role;
grant all on public.daily_step_activity to service_role;
grant all on public.walking_rewards to service_role;
grant all on public.fitness_badges to service_role;
grant all on public.fitness_leaderboard to service_role;

notify pgrst, 'reload schema';
`.trim();

async function seedDefaults(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from(FITNESS_CHALLENGES_TABLE)
    .select('id', { count: 'exact', head: true });
  if (error || (count ?? 0) > 0) return 0;
  const rows = DEFAULT_FITNESS_CHALLENGES.map((c, i) => ({
    name: c.name,
    goal_type: c.goalType,
    goal_target: c.goalTarget,
    points: c.points,
    active: i === 4, // 10,000 steps active by default
  }));
  const { error: insErr } = await supabaseAdmin.from(FITNESS_CHALLENGES_TABLE).insert(rows);
  return insErr ? 0 : rows.length;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabaseAdmin.from(FITNESS_CHALLENGES_TABLE).select('id').limit(1);
  if (isMissingTableError(error)) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: !error });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error: rpcError } = await supabaseAdmin.rpc('exec_sql', { sql: SETUP_SQL });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const { error: checkError } = await supabaseAdmin.from(FITNESS_CHALLENGES_TABLE).select('id').limit(1);
  if (isMissingTableError(checkError)) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Automatic setup is not available on this database (the exec_sql helper is missing). Please run SETUP_FITNESS.sql in the Supabase SQL editor, then reopen this page.',
        sql: SETUP_SQL,
        rpcError: rpcError?.message || null,
      },
      { status: 503 }
    );
  }
  const seeded = await seedDefaults();
  return NextResponse.json({ success: true, message: 'Fitness tables are ready.', seeded });
}
