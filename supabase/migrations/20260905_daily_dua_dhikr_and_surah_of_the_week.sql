-- Tables + RLS for Daily Duas, Dhikr counters, and Surah of the Week progress.
-- Safe to re-run. Use `set check_function_bodies = false` for Supabase pgsql compatibility.

set check_function_bodies = off;

do $$ begin
  create table if not exists public.daily_dua_completions (
    user_id uuid not null references auth.users(id) on delete cascade,
    completion_date date not null default (timezone('utc'::text, now()))::date,
    dua_key text not null,
    slot text not null check (slot in ('morning','evening','any')),
    created_at timestamptz not null default timezone('utc'::text, now()),
    primary key (user_id, completion_date, dua_key, slot)
  );
exception when duplicate_table then null;
end $$;

create index if not exists daily_dua_completions_user_date_idx
  on public.daily_dua_completions (user_id, completion_date desc);

do $$ begin alter table public.daily_dua_completions enable row level security; exception when others then null; end $$;

drop policy if exists "Users can view their own daily dua completions" on public.daily_dua_completions;
create policy "Users can view their own daily dua completions"
  on public.daily_dua_completions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own daily dua completions" on public.daily_dua_completions;
create policy "Users can insert their own daily dua completions"
  on public.daily_dua_completions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

do $$ begin
  grant select, insert on public.daily_dua_completions to authenticated;
  grant all on public.daily_dua_completions to service_role;
exception when insufficient_privilege then null;
end $$;

-- Dhikr counters (per user per day per dhikr key)
do $$ begin
  create table if not exists public.daily_dhikr_log (
    user_id uuid not null references auth.users(id) on delete cascade,
    log_date date not null default (timezone('utc'::text, now()))::date,
    dhikr_key text not null,
    total_count int not null default 0 check (total_count >= 0),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    primary key (user_id, log_date, dhikr_key)
  );
exception when duplicate_table then null;
end $$;

create index if not exists daily_dhikr_log_user_date_idx
  on public.daily_dhikr_log (user_id, log_date desc);

do $$ begin alter table public.daily_dhikr_log enable row level security; exception when others then null; end $$;

drop policy if exists "Users can view their own daily dhikr log" on public.daily_dhikr_log;
create policy "Users can view their own daily dhikr log"
  on public.daily_dhikr_log
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own daily dhikr log" on public.daily_dhikr_log;
create policy "Users can insert their own daily dhikr log"
  on public.daily_dhikr_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own daily dhikr log" on public.daily_dhikr_log;
create policy "Users can update their own daily dhikr log"
  on public.daily_dhikr_log
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$ begin
  grant select, insert, update on public.daily_dhikr_log to authenticated;
  grant all on public.daily_dhikr_log to service_role;
exception when insufficient_privilege then null;
end $$;

-- Surah of the Week: per user per week progress
do $$ begin
  create table if not exists public.surah_of_the_week_progress (
    user_id uuid not null references auth.users(id) on delete cascade,
    week_start_date date not null,
    surah_number int not null check (surah_number between 1 and 114),
    read_minutes int not null default 0 check (read_minutes >= 0),
    listened boolean not null default false,
    read_full boolean not null default false,
    practiced_at_least_once boolean not null default false,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    primary key (user_id, week_start_date)
  );
exception when duplicate_table then null;
end $$;

create index if not exists surah_of_the_week_progress_user_week_idx
  on public.surah_of_the_week_progress (user_id, week_start_date desc);

do $$ begin alter table public.surah_of_the_week_progress enable row level security; exception when others then null; end $$;

drop policy if exists "Users can view their own surah of the week progress" on public.surah_of_the_week_progress;
create policy "Users can view their own surah of the week progress"
  on public.surah_of_the_week_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own surah of the week progress" on public.surah_of_the_week_progress;
create policy "Users can insert their own surah of the week progress"
  on public.surah_of_the_week_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own surah of the week progress" on public.surah_of_the_week_progress;
create policy "Users can update their own surah of the week progress"
  on public.surah_of_the_week_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$ begin
  grant select, insert, update on public.surah_of_the_week_progress to authenticated;
  grant all on public.surah_of_the_week_progress to service_role;
exception when insufficient_privilege then null;
end $$;
