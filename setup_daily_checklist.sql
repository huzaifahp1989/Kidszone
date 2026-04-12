-- Create Daily Progress Table
create table if not exists daily_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date default current_date not null,
  completed_items jsonb default '[]'::jsonb,
  good_deed text,
  daily_points int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- Enable RLS
alter table daily_progress enable row level security;

-- Policies
drop policy if exists "Users can view their own daily progress" on daily_progress;
create policy "Users can view their own daily progress"
  on daily_progress for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own daily progress" on daily_progress;
create policy "Users can insert their own daily progress"
  on daily_progress for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own daily progress" on daily_progress;
create policy "Users can update their own daily progress"
  on daily_progress for update
  using ( auth.uid() = user_id );

-- Grant permissions (if needed for service role or authenticated)
grant all on daily_progress to service_role;
grant all on daily_progress to authenticated;
