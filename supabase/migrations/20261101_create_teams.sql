-- Teams / class competitions.
-- A team is created by an admin or teacher and joined by learners using a
-- short join code, so children cannot discover or message each other freely.
-- One team per learner keeps the leaderboard aggregation simple.
-- Safe to re-run.

do $$ begin
  create table if not exists public.teams (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    emoji text not null default '🕌',
    colour text not null default '#0d9488',
    join_code text not null unique,
    owner_user_id uuid,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
  );
exception when duplicate_table then null;
end $$;

do $$ begin
  create table if not exists public.team_members (
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null references public.teams(id) on delete cascade,
    user_id uuid not null unique references auth.users(id) on delete cascade,
    role text not null default 'member' check (role in ('member', 'captain')),
    joined_at timestamptz not null default timezone('utc'::text, now())
  );
exception when duplicate_table then null;
end $$;

create index if not exists team_members_team_idx
  on public.team_members (team_id);

create index if not exists team_members_user_idx
  on public.team_members (user_id);

-- Teams are not sensitive, so they can be read by anyone. Member rows stay
-- private; the API only exposes aggregated counts and first names.
do $$ begin alter table public.teams enable row level security; exception when others then null; end $$;
do $$ begin alter table public.team_members enable row level security; exception when others then null; end $$;

drop policy if exists "Teams are readable by everyone" on public.teams;
create policy "Teams are readable by everyone"
  on public.teams
  for select
  to anon, authenticated
  using (true);

-- Learners can see their own membership row only.
drop policy if exists "Members can view their own team membership" on public.team_members;
create policy "Members can view their own team membership"
  on public.team_members
  for select
  to authenticated
  using (auth.uid() = user_id);

do $$ begin
  grant select on public.teams to anon, authenticated;
  grant select on public.team_members to authenticated;
  grant all on public.teams to service_role;
  grant all on public.team_members to service_role;
end $$;
