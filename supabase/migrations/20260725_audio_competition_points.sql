-- Audio Competition: track points awarded on admin approve / place.
alter table public.audio_submissions
  add column if not exists points_awarded integer not null default 0;
