-- Add mission bonus claim tracking for the Kids Zone daily missions feature
alter table public.daily_progress
add column if not exists mission_bonus_claimed_at timestamp with time zone;

alter table public.daily_progress
add column if not exists mission_bonus_points int default 0;