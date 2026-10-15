-- Adds per-user reminder configuration columns used by /reminders and /api/cron/send-user-reminders.
-- Run this in Supabase SQL Editor before using the reminder feature.
-- Background delivery also requires OneSignal REST keys and the Vercel cron
-- at /api/cron/send-user-reminders from vercel.json to be enabled.

alter table public.users
add column if not exists reminder_settings jsonb default null,
add column if not exists reminder_timezone text not null default 'Europe/London',
add column if not exists reminder_last_sent_at jsonb default null;

comment on column public.users.reminder_settings is 'Per-user OneSignal reminder schedule (adhan, activities, custom alarm)';
comment on column public.users.reminder_timezone is 'IANA timezone used to deliver reminders at the selected local time';
comment on column public.users.reminder_last_sent_at is 'Tracks last successful push delivery per reminder key';
