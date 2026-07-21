-- Family usernames: shared family email login + unique username per learner
-- Run in Supabase SQL editor after existing users schema is in place.

alter table public.users
  add column if not exists username text;

alter table public.users
  add column if not exists family_email text;

-- Backfill family_email from existing email
update public.users
set family_email = lower(trim(email))
where family_email is null
  and email is not null
  and trim(email) <> '';

-- Normalize any existing usernames to lowercase
update public.users
set username = lower(trim(username))
where username is not null
  and username <> lower(trim(username));

create unique index if not exists users_username_lower_uidx
  on public.users (lower(username))
  where username is not null and trim(username) <> '';

create index if not exists users_family_email_idx
  on public.users (lower(family_email));

-- Allow authenticated users to look up username availability / family members by family_email
-- (RLS: keep existing policies; service role used for resolve-login and sibling create)

create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta_username text;
  meta_family_email text;
  meta_age int;
begin
  begin
    meta_username := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '');
    meta_family_email := nullif(lower(trim(coalesce(
      new.raw_user_meta_data->>'family_email',
      new.raw_user_meta_data->>'familyEmail',
      new.email
    ))), '');
    meta_age := coalesce((new.raw_user_meta_data->>'age')::int, 10);

    insert into public.users (
      uid,
      email,
      name,
      age,
      role,
      points,
      weeklypoints,
      monthlypoints,
      level,
      username,
      family_email
    )
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'name', 'Learner'),
      meta_age,
      'kid',
      0,
      0,
      0,
      'Beginner',
      meta_username,
      meta_family_email
    )
    on conflict (uid) do update set
      username = coalesce(excluded.username, public.users.username),
      family_email = coalesce(excluded.family_email, public.users.family_email),
      age = coalesce(excluded.age, public.users.age),
      name = case
        when public.users.name is null or public.users.name = '' or public.users.name ilike 'learner%'
          then excluded.name
        else public.users.name
      end;

    insert into public.users_points (user_id, total_points, weekly_points, monthly_points, today_points)
    values (new.id, 0, 0, 0, 0)
    on conflict (user_id) do nothing;
  exception when others then
    raise warning 'handle_new_user trigger failed: %', sqlerrm;
  end;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
