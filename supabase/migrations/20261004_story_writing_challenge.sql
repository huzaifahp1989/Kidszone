-- Islamic Story Writing Challenge
-- Additive migration: creates new story_* tables only. Points are written to the EXISTING
-- Kids Zone tables (public.users_points / public.users) by story_apply_review(); there is no
-- separate points balance or leaderboard.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- challenges
create table if not exists public.story_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  age_group text not null default 'all' check (age_group in ('all', '5-7', '8-10', '11-14')),
  start_date date not null default current_date,
  end_date date not null default (current_date + 30),
  bonus_points integer not null default 0 check (bonus_points >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ---------------------------------------------------------------- submissions
create table if not exists public.story_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  content text not null default '',
  islamic_lesson text not null default '',
  category text,
  illustration_url text,
  illustration_path text,
  challenge_id uuid references public.story_challenges(id) on delete set null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
  admin_notes text,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  reviewed_by text,
  reviewed_at timestamptz,
  age_group text not null default 'all',
  word_count integer not null default 0,
  moderation_flags text[] not null default '{}',
  is_flagged boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists story_submissions_user_idx on public.story_submissions(user_id, updated_at desc);
create index if not exists story_submissions_status_idx on public.story_submissions(status, submitted_at desc);
create index if not exists story_submissions_challenge_idx on public.story_submissions(challenge_id);

-- ---------------------------------------------------------------- points ledger
-- One row per approved story. story_id is UNIQUE so a story can never be paid twice;
-- re-pricing a story updates this same row.
create table if not exists public.story_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  story_id uuid not null unique references public.story_submissions(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  reason text not null default 'Story approved',
  breakdown jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists story_points_user_idx on public.story_points(user_id);
create index if not exists story_points_created_idx on public.story_points(created_at);

-- ---------------------------------------------------------------- badges
create table if not exists public.story_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  badge_key text not null,
  story_id uuid references public.story_submissions(id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

-- ---------------------------------------------------------------- competitions & prizes
create table if not exists public.monthly_story_competitions (
  id uuid primary key default gen_random_uuid(),
  month_key text not null unique check (month_key ~ '^\d{4}-\d{2}$'),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'FINALIZED')),
  winners jsonb not null default '[]'::jsonb,
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.story_prizes (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.monthly_story_competitions(id) on delete cascade,
  rank integer not null check (rank between 1 and 4),
  title text not null,
  description text not null default '',
  winner_user_id uuid,
  status text not null default 'PRIZE_PENDING'
    check (status in ('PRIZE_PENDING', 'PRIZE_SENT', 'PRIZE_COLLECTED')),
  status_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ranks 1-3 have a single prize each; rank 4 ("other") can hold several.
create unique index if not exists story_prizes_top_rank_uidx
  on public.story_prizes(competition_id, rank) where rank <= 3;

-- ---------------------------------------------------------------- notifications
create table if not exists public.story_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null default 'info',
  title text not null,
  body text not null,
  story_id uuid references public.story_submissions(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists story_notifications_user_idx on public.story_notifications(user_id, created_at desc);

-- All access goes through server API routes using the service role, so children can never
-- read each other's private stories directly. No policies = no anon/authenticated access.
alter table public.story_challenges enable row level security;
alter table public.story_submissions enable row level security;
alter table public.story_points enable row level security;
alter table public.story_badges enable row level security;
alter table public.monthly_story_competitions enable row level security;
alter table public.story_prizes enable row level security;
alter table public.story_notifications enable row level security;

-- ---------------------------------------------------------------- review + points (atomic)
-- Approve / reject / request changes in ONE transaction. The story row is locked, the single
-- story_points row is upserted, and only the DIFFERENCE is applied to the existing Kids Zone
-- totals (users_points + users mirror). Re-approving with a new amount adjusts, never duplicates.
create or replace function public.story_apply_review(
  p_story_id uuid,
  p_action text,
  p_points integer,
  p_notes text,
  p_reviewer text,
  p_breakdown jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.story_submissions%rowtype;
  existing public.story_points%rowtype;
  new_points integer := 0;
  old_points integer := 0;
  delta integer := 0;
  new_status text;
  up public.users_points%rowtype;
  u_points integer; u_weekly integer; u_monthly integer;
  base_total integer; base_weekly integer; base_monthly integer;
  new_total integer; new_weekly integer; new_monthly integer;
  new_badges integer;
  today_utc date := (now() at time zone 'utc')::date;
begin
  select * into s from public.story_submissions where id = p_story_id for update;
  if not found then
    raise exception 'Story not found' using errcode = 'P0002';
  end if;

  select * into existing from public.story_points where story_id = p_story_id;
  old_points := coalesce(existing.points, 0);

  if p_action = 'APPROVE' then
    if s.status not in ('PENDING', 'APPROVED') then
      raise exception 'Only submitted stories can be approved (status is %).', s.status using errcode = '22023';
    end if;
    new_points := greatest(0, coalesce(p_points, 0));
    new_status := 'APPROVED';
  elsif p_action = 'REJECT' or p_action = 'REQUEST_CHANGES' then
    if s.status not in ('PENDING', 'APPROVED') then
      raise exception 'Only submitted stories can be reviewed (status is %).', s.status using errcode = '22023';
    end if;
    -- Withdrawing a previously approved story reverses its points through the same row.
    new_points := 0;
    new_status := case when p_action = 'REJECT' then 'REJECTED' else 'CHANGES_REQUESTED' end;
  else
    raise exception 'Unknown action %', p_action using errcode = '22023';
  end if;

  if p_action = 'APPROVE' or existing.id is not null then
    insert into public.story_points (user_id, story_id, points, reason, breakdown)
    values (s.user_id, s.id, new_points,
            case when p_action = 'APPROVE' then 'Story approved: ' || left(s.title, 80) else 'Story approval withdrawn: ' || left(s.title, 80) end,
            coalesce(p_breakdown, '[]'::jsonb))
    on conflict (story_id) do update
      set points = excluded.points,
          reason = excluded.reason,
          breakdown = case when p_action = 'APPROVE' then excluded.breakdown else public.story_points.breakdown end,
          updated_at = now();
  end if;

  delta := new_points - old_points;

  if delta <> 0 then
    select * into up from public.users_points where user_id = s.user_id for update;
    select points, weeklypoints, monthlypoints into u_points, u_weekly, u_monthly
      from public.users where uid = s.user_id;

    base_total := greatest(0, coalesce(up.total_points, 0), coalesce(u_points, 0));
    base_weekly := greatest(0, coalesce(up.weekly_points, 0), coalesce(u_weekly, 0));
    base_monthly := greatest(0, coalesce(up.monthly_points, 0), coalesce(u_monthly, 0));
    if up.last_earned_date is not null and to_char(up.last_earned_date, 'YYYY-MM') <> to_char(today_utc, 'YYYY-MM') then
      base_monthly := 0;
    end if;

    new_total := greatest(0, base_total + delta);
    new_weekly := greatest(0, base_weekly + delta);
    new_monthly := greatest(0, base_monthly + delta);
    new_badges := floor(new_total / 100.0);

    insert into public.users_points (user_id, total_points, weekly_points, monthly_points, today_points, last_earned_date, badges, level)
    values (s.user_id, new_total, new_weekly, new_monthly, 0, today_utc, new_badges, 1 + floor(new_badges / 5.0))
    on conflict (user_id) do update
      set total_points = excluded.total_points,
          weekly_points = excluded.weekly_points,
          monthly_points = excluded.monthly_points,
          badges = excluded.badges,
          level = excluded.level,
          today_points = case when public.users_points.last_earned_date = today_utc then public.users_points.today_points else 0 end,
          last_earned_date = today_utc;

    update public.users
      set points = new_total, weeklypoints = new_weekly, monthlypoints = new_monthly
      where uid = s.user_id;
  end if;

  update public.story_submissions
    set status = new_status,
        points_awarded = new_points,
        admin_notes = p_notes,
        reviewed_by = p_reviewer,
        reviewed_at = now(),
        updated_at = now()
    where id = s.id;

  return jsonb_build_object(
    'story_id', s.id,
    'user_id', s.user_id,
    'status', new_status,
    'points_awarded', new_points,
    'previous_points', old_points,
    'delta', delta,
    'was_approved', s.status = 'APPROVED'
  );
end;
$$;

-- ---------------------------------------------------------------- leaderboard
-- Ranks children by story points earned inside a window (null = unbounded).
create or replace function public.story_leaderboard(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 100
) returns table (user_id uuid, story_points bigint, stories_approved bigint, first_awarded timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select sp.user_id,
         sum(sp.points)::bigint,
         count(*)::bigint,
         min(sp.created_at)
  from public.story_points sp
  where sp.points > 0
    and (p_from is null or sp.created_at >= p_from)
    and (p_to is null or sp.created_at < p_to)
  group by sp.user_id
  order by sum(sp.points) desc, count(*) desc, min(sp.created_at) asc
  limit greatest(1, p_limit);
$$;

-- ---------------------------------------------------------------- monthly competition
-- Idempotent: creates the month's competition once and copies the prize line-up from the most
-- recent earlier competition (titles only, unassigned and pending).
create or replace function public.story_ensure_competition(p_month_key text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  comp_id uuid;
  start_d date := to_date(p_month_key || '-01', 'YYYY-MM-DD');
  prev_id uuid;
begin
  insert into public.monthly_story_competitions (month_key, starts_on, ends_on)
  values (p_month_key, start_d, (start_d + interval '1 month - 1 day')::date)
  on conflict (month_key) do nothing
  returning id into comp_id;

  if comp_id is null then
    select id into comp_id from public.monthly_story_competitions where month_key = p_month_key;
    return comp_id;
  end if;

  select id into prev_id from public.monthly_story_competitions
    where month_key < p_month_key and exists (select 1 from public.story_prizes p where p.competition_id = monthly_story_competitions.id)
    order by month_key desc limit 1;

  if prev_id is not null then
    insert into public.story_prizes (competition_id, rank, title, description)
    select comp_id, rank, title, description from public.story_prizes where competition_id = prev_id;
  end if;

  return comp_id;
end;
$$;

-- Closes a finished month: stores the top 10 and assigns prize winners for ranks 1-3.
-- Returns finalized=false when already closed (so winner notifications are sent only once).
create or replace function public.story_finalize_competition(p_month_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.monthly_story_competitions%rowtype;
  top jsonb;
begin
  select * into c from public.monthly_story_competitions where month_key = p_month_key for update;
  if not found or c.status = 'FINALIZED' then
    return jsonb_build_object('finalized', false);
  end if;
  if now() < (c.ends_on + 1)::timestamp at time zone 'utc' then
    return jsonb_build_object('finalized', false, 'reason', 'month_not_ended');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'rank', t.rn, 'user_id', t.user_id, 'story_points', t.story_points, 'stories_approved', t.stories_approved
         ) order by t.rn), '[]'::jsonb)
    into top
  from (
    select row_number() over (order by l.story_points desc, l.stories_approved desc, l.first_awarded asc) as rn,
           l.user_id, l.story_points, l.stories_approved
    from public.story_leaderboard(c.starts_on::timestamp at time zone 'utc', (c.ends_on + 1)::timestamp at time zone 'utc', 10) l
  ) t;

  update public.monthly_story_competitions
    set status = 'FINALIZED', winners = top, finalized_at = now()
    where id = c.id;

  update public.story_prizes p
    set winner_user_id = (w ->> 'user_id')::uuid, updated_at = now()
    from jsonb_array_elements(top) w
    where p.competition_id = c.id and p.rank <= 3 and (w ->> 'rank')::int = p.rank;

  return jsonb_build_object('finalized', true, 'winners', top);
end;
$$;

revoke all on function public.story_apply_review(uuid, text, integer, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.story_leaderboard(timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.story_ensure_competition(text) from public, anon, authenticated;
revoke all on function public.story_finalize_competition(text) from public, anon, authenticated;
grant execute on function public.story_apply_review(uuid, text, integer, text, text, jsonb) to service_role;
grant execute on function public.story_leaderboard(timestamptz, timestamptz, integer) to service_role;
grant execute on function public.story_ensure_competition(text) to service_role;
grant execute on function public.story_finalize_competition(text) to service_role;
