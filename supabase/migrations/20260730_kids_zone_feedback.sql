-- Kids Zone Feedback Survey submissions
create table if not exists kids_zone_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  age integer,
  city text,
  phone_number text,
  wants_reminder boolean default false,
  feedback_text text,
  how_benefiting text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  points_awarded integer not null default 0,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index for admin listing
create index if not exists kids_zone_feedback_status_idx on kids_zone_feedback (status, created_at desc);
create index if not exists kids_zone_feedback_user_idx on kids_zone_feedback (user_id);

-- RLS: users can insert their own rows, admin reads via service role
alter table kids_zone_feedback enable row level security;
create policy "users can insert feedback" on kids_zone_feedback
  for insert with check (true);
create policy "users can view own feedback" on kids_zone_feedback
  for select using (auth.uid() = user_id);
