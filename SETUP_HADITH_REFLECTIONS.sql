-- Typed "what I learned" journal entries for Daily Hadith.
-- Run in Supabase SQL editor if reflections should be saved (points still work via game_progress markers).

create table if not exists public.hadith_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  hadith_id text not null,
  reflection text not null check (char_length(trim(reflection)) >= 20),
  day_key date not null default ((timezone('utc', now()))::date),
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, day_key)
);

create index if not exists hadith_reflections_user_created_idx
  on public.hadith_reflections (user_id, created_at desc);

alter table public.hadith_reflections enable row level security;

drop policy if exists "Users read own hadith reflections" on public.hadith_reflections;
create policy "Users read own hadith reflections"
  on public.hadith_reflections for select
  using (auth.uid() = user_id);

-- Inserts go through service role from the API.
