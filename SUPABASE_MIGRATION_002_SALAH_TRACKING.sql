create extension if not exists pgcrypto;

create table if not exists public.salah_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  prayer text not null check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  status text not null check (status in ('completed','missed')),
  prayed_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, prayer)
);

create index if not exists idx_salah_entries_user_date on public.salah_entries(user_id, date);
create index if not exists idx_salah_entries_date on public.salah_entries(date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_salah_entries_updated_at on public.salah_entries;
create trigger trg_salah_entries_updated_at
before update on public.salah_entries
for each row execute procedure public.set_updated_at();

alter table public.salah_entries enable row level security;

drop policy if exists "Users can view own salah entries" on public.salah_entries;
create policy "Users can view own salah entries"
on public.salah_entries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own salah entries" on public.salah_entries;
create policy "Users can insert own salah entries"
on public.salah_entries
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own salah entries" on public.salah_entries;
create policy "Users can update own salah entries"
on public.salah_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own salah entries" on public.salah_entries;
create policy "Users can delete own salah entries"
on public.salah_entries
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Service role can manage salah entries" on public.salah_entries;
create policy "Service role can manage salah entries"
on public.salah_entries
for all
to service_role
using (true)
with check (true);

grant select, insert, update, delete on public.salah_entries to authenticated;
grant all on public.salah_entries to service_role;
