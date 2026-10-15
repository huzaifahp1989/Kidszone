-- Quran Quiz Duels: 1v1 challenges via shareable code.
-- Async model: each player answers their 10 questions within 7 days; winner
-- is declared once both submitted or the window expires.

set check_function_bodies = off;

do $$ begin
  create table if not exists public.quran_duels (
    id uuid primary key default gen_random_uuid(),
    duel_code text not null unique,
    status text not null default 'waiting'
      check (status in ('waiting','in_progress','finished','expired','cancelled')),

    creator_id uuid not null references auth.users(id) on delete cascade,
    creator_name text not null,
    opponent_id uuid references auth.users(id) on delete set null,
    opponent_name text,

    question_ids text[] not null default '{}',
    question_seed text not null,
    difficulty text not null default 'mixed' check (difficulty in ('easy','medium','hard','mixed')),
    num_questions int not null default 10 check (num_questions between 5 and 20),

    creator_answers jsonb not null default '{}'::jsonb,
    creator_correct int not null default 0 check (creator_correct >= 0),
    creator_duration_seconds int not null default 0 check (creator_duration_seconds >= 0),
    creator_submitted_at timestamptz,

    opponent_answers jsonb not null default '{}'::jsonb,
    opponent_correct int not null default 0 check (opponent_correct >= 0),
    opponent_duration_seconds int not null default 0 check (opponent_duration_seconds >= 0),
    opponent_submitted_at timestamptz,

    winner_id uuid references auth.users(id) on delete set null,
    is_tie boolean not null default false,
    creator_points_awarded int not null default 0 check (creator_points_awarded >= 0),
    opponent_points_awarded int not null default 0 check (opponent_points_awarded >= 0),
    creator_badges_awarded int not null default 0 check (creator_badges_awarded >= 0),
    opponent_badges_awarded int not null default 0 check (opponent_badges_awarded >= 0),

    expires_at timestamptz not null default (timezone('utc'::text, now()) + interval '7 days'),
    finished_at timestamptz,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
  );
exception when duplicate_table then null;
end $$;

create index if not exists quran_duels_code_idx on public.quran_duels (duel_code);
create index if not exists quran_duels_creator_idx on public.quran_duels (creator_id, created_at desc);
create index if not exists quran_duels_opponent_idx on public.quran_duels (opponent_id, created_at desc);
create index if not exists quran_duels_status_idx on public.quran_duels (status, expires_at asc);

do $$ begin alter table public.quran_duels enable row level security; exception when others then null; end $$;

drop policy if exists "Users can view duels they are part of" on public.quran_duels;
create policy "Users can view duels they are part of"
  on public.quran_duels
  for select
  to authenticated
  using (auth.uid() = creator_id or auth.uid() = opponent_id);

drop policy if exists "Users can create duels as themselves" on public.quran_duels;
create policy "Users can create duels as themselves"
  on public.quran_duels
  for insert
  to authenticated
  with check (auth.uid() = creator_id);

drop policy if exists "Users can update duels they participate in" on public.quran_duels;
create policy "Users can update duels they participate in"
  on public.quran_duels
  for update
  to authenticated
  using (auth.uid() = creator_id or auth.uid() = opponent_id)
  with check (auth.uid() = creator_id or auth.uid() = opponent_id);

do $$ begin
  grant select, insert, update on public.quran_duels to authenticated;
  grant all on public.quran_duels to service_role;
exception when insufficient_privilege then null;
end $$;

-- Aggregate duel stats for leaderboard/profile.
create or replace view public.quran_duel_stats as
  select
    player_id,
    count(*) filter (where player_role = 'any') as duels_played,
    count(*) filter (where player_role = 'winner') as duels_won,
    count(*) filter (where player_role = 'tie') as duels_tied,
    count(*) filter (where player_role = 'loser') as duels_lost,
    coalesce(sum(points_awarded), 0)::bigint as duel_points,
    coalesce(sum(badges_awarded), 0)::bigint as duel_badges
  from (
    select creator_id as player_id,
      case
        when status <> 'finished' then 'any'
        when winner_id = creator_id then 'winner'
        when is_tie then 'tie'
        else 'loser'
      end as player_role,
      creator_points_awarded as points_awarded,
      creator_badges_awarded as badges_awarded
    from public.quran_duels
    where status = 'finished' and creator_submitted_at is not null
    union all
    select opponent_id as player_id,
      case
        when status <> 'finished' then 'any'
        when winner_id = opponent_id then 'winner'
        when is_tie then 'tie'
        else 'loser'
      end as player_role,
      opponent_points_awarded as points_awarded,
      opponent_badges_awarded as badges_awarded
    from public.quran_duels
    where status = 'finished' and opponent_submitted_at is not null
  ) t
  group by 1;

do $$ begin
  grant select on public.quran_duel_stats to authenticated;
  grant select on public.quran_duel_stats to service_role;
exception when insufficient_privilege then null;
end $$;
