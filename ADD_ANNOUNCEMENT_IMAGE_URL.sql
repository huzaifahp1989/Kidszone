-- ============================================================
-- MINIMAL FIX: add image_url only (run this first)
-- Supabase → SQL Editor → paste → Run
-- ============================================================

alter table public.site_announcements
add column if not exists image_url text;

-- Confirm column exists:
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'site_announcements'
  and column_name = 'image_url';
