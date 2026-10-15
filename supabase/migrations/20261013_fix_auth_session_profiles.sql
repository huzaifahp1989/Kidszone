-- Ensure every authenticated account has the rows required by the app after
-- password sign-in. Auth tokens are persisted by the client; these records
-- prevent the post-sign-in profile load from failing under RLS.

create table if not exists public.users_points (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_points integer not null default 0,
  weekly_points integer not null default 0,
  monthly_points integer not null default 0,
  today_points integer not null default 0,
  last_earned_date date not null default (timezone('utc', now())::date),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.users_points enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
  on public.users for select
  to authenticated
  using (auth.uid() = uid);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users for insert
  to authenticated
  with check (auth.uid() = uid);

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
    nullif(split_part(new.email, '@', 1), ''),
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

  insert into public.users (uid, email, name, age, role, points, weeklypoints, monthlypoints, level)
  values (new.id, new.email, display_name, account_age, 'kid', 0, 0, 0, 'Beginner')
  on conflict (uid) do update
    set email = excluded.email;

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

grant select, insert, update on public.users to authenticated;
grant select, insert, update on public.users_points to authenticated;
