-- ============================================================
-- FULL SETUP: only run if site_announcements table is missing
-- Run ONE block at a time if Supabase complains
-- ============================================================

-- BLOCK 1: create table (skip if table already exists)
create table if not exists public.site_announcements (
  id uuid default gen_random_uuid() primary key,
  message_text text not null default '',
  bg_color text not null default '#4f46e5',
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- If your table uses column name "text" not "message_text", ignore BLOCK 1
-- and use ADD_ANNOUNCEMENT_IMAGE_URL.sql instead

-- BLOCK 2: add all optional columns
alter table public.site_announcements add column if not exists display_mode text not null default 'inline';
alter table public.site_announcements add column if not exists target_paths text[] not null default array['*']::text[];
alter table public.site_announcements add column if not exists popup_delay_seconds integer not null default 0;
alter table public.site_announcements add column if not exists popup_repeat_minutes integer not null default 1440;
alter table public.site_announcements add column if not exists start_at timestamptz null;
alter table public.site_announcements add column if not exists end_at timestamptz null;
alter table public.site_announcements add column if not exists repeat_unit text not null default 'always';
alter table public.site_announcements add column if not exists repeat_every integer not null default 1;
alter table public.site_announcements add column if not exists show_for_hours integer not null default 24;
alter table public.site_announcements add column if not exists image_url text null;

-- BLOCK 3: RLS
alter table public.site_announcements enable row level security;

drop policy if exists "Public can read active announcements" on public.site_announcements;
create policy "Public can read active announcements"
  on public.site_announcements for select
  using (active = true);
