-- Adds per-user reminder configuration columns used by /reminders and /api/cron/send-user-reminders.
-- Run this in Supabase SQL Editor before using the reminder feature.

alter table public.users
add column if not exists reminder_settings jsonb default null,
add column if not exists reminder_last_sent_at jsonb default null;

comment on column public.users.reminder_settings is 'Per-user OneSignal reminder schedule (adhan, activities, custom alarm)';
comment on column public.users.reminder_last_sent_at is 'Tracks last sent timestamp per reminder key';
