-- Kids Zone: complete sign-in database repair
-- Run this entire file once in Supabase SQL Editor.
--
-- This repairs the database records used immediately after Auth sign-in.
-- Browser sessions are stored by Supabase Auth in the browser; SQL cannot
-- write localStorage/cookies, but this script makes sure every Auth user has
-- a readable profile and points row after signing in.

create table if not exists public.users (
  uid uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text not null default 'kid',
  name text not null default 'Learner',
  age integer not null default 10,
  points integer not null default 0,
  weeklypoints integer not null default 0,
  monthlypoints integer not null default 0,
  level text not null default 'Beginner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists email text;
alter table public.users add column if not exists role text default 'kid';
alter table public.users add column if not exists name text default 'Learner';
alter table public.users add column if not exists age integer default 10;
alter table public.users add column if not exists points integer default 0;
alter table public.users add column if not exists weeklypoints integer default 0;
alter table public.users add column if not exists monthlypoints integer default 0;
alter table public.users add column if not exists level text default 'Beginner';
alter table public.users add column if not exists username text;
alter table public.users add column if not exists family_email text;
alter table public.users add column if not exists city text;
alter table public.users add column if not exists contact_number text;
alter table public.users add column if not exists badges integer default 0;
alter table public.users add column if not exists created_at timestamptz default now();
alter table public.users add column if not exists updated_at timestamptz default now();

create table if not exists public.users_points (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_points integer not null default 0,
  weekly_points integer not null default 0,
  monthly_points integer not null default 0,
  today_points integer not null default 0,
  last_earned_date date not null default (timezone('utc', now())::date),
  badges integer not null default 0,
  level integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.users_points add column if not exists total_points integer default 0;
alter table public.users_points add column if not exists weekly_points integer default 0;
alter table public.users_points add column if not exists monthly_points integer default 0;
alter table public.users_points add column if not exists today_points integer default 0;
alter table public.users_points add column if not exists last_earned_date date default (timezone('utc', now())::date);
alter table public.users_points add column if not exists badges integer default 0;
alter table public.users_points add column if not exists level integer default 1;
alter table public.users_points add column if not exists updated_at timestamptz default now();

create index if not exists users_uid_idx on public.users (uid);
create index if not exists users_email_idx on public.users (lower(email));
create index if not exists users_points_user_id_idx on public.users_points (user_id);

alter table public.users enable row level security;
alter table public.users_points enable row level security;

drop policy if exists "Users can read their own profile" on public.users;
drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
  on public.users for select
  to authenticated
  using (auth.uid() = uid);

drop policy if exists "Users can insert their own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users for insert
  to authenticated
  with check (auth.uid() = uid);

drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = uid)
  with check (auth.uid() = uid);

drop policy if exists "Users can read own points" on public.users_points;
create policy "Users can read own points"
  on public.users_points for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own points" on public.users_points;
create policy "Users can insert own points"
  on public.users_points for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own points" on public.users_points;
create policy "Users can update own points"
  on public.users_points for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.ensure_auth_user_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  account_age integer;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Learner'
  );

  account_age := greatest(
    5,
    least(
      14,
      case
        when (new.raw_user_meta_data ->> 'age') ~ '^[0-9]+$'
          then (new.raw_user_meta_data ->> 'age')::integer
        else 10
      end
    )
  );

  insert into public.users (uid, email, role, name, age, points, weeklypoints, monthlypoints, level)
  values (new.id, new.email, 'kid', display_name, account_age, 0, 0, 0, 'Beginner')
  on conflict (uid) do update
    set email = excluded.email,
        updated_at = now();

  insert into public.users_points (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
exception
  when others then
    raise warning 'ensure_auth_user_records failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.ensure_auth_user_records();

-- Backfill existing Auth accounts, including accounts created before this fix.
insert into public.users (uid, email, role, name, age, points, weeklypoints, monthlypoints, level)
select
  au.id,
  au.email,
  'kid',
  coalesce(
    nullif(trim(au.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(au.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(au.email, ''), '@', 1), ''),
    'Learner'
  ),
  10,
  0,
  0,
  0,
  'Beginner'
from auth.users au
on conflict (uid) do update
  set email = excluded.email,
      updated_at = now();

insert into public.users_points (user_id)
select au.id
from auth.users au
on conflict (user_id) do nothing;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.users to authenticated;
grant select, insert, update on public.users_points to authenticated;

-- Verification: these should return one row per Auth account.
select
  au.id,
  au.email,
  au.email_confirmed_at is not null as email_confirmed,
  u.uid is not null as has_profile,
  up.user_id is not null as has_points_row
from auth.users au
left join public.users u on u.uid = au.id
left join public.users_points up on up.user_id = au.id
order by au.created_at desc;
