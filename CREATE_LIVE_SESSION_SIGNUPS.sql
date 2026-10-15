create table if not exists public.live_session_signups (
  id uuid primary key default gen_random_uuid(),
  child_name text not null,
  child_age integer not null check (child_age between 1 and 17),
  phone_number text not null,
  created_at timestamptz not null default now()
);

alter table public.live_session_signups enable row level security;

create index if not exists live_session_signups_created_at_idx
  on public.live_session_signups (created_at desc);