-- 1. Ensure daily_progress table exists
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
do $$ begin
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
end $$;

-- Grant permissions
grant all on daily_progress to service_role;
grant all on daily_progress to authenticated;

-- 2. Create increment_points RPC function
create or replace function increment_points(row_id uuid, amount int)
returns void
language plpgsql
security definer
as $$
begin
  -- Update users table (legacy)
  update public.users
  set 
    points = coalesce(points, 0) + amount,
    weeklypoints = coalesce(weeklypoints, 0) + amount
  where uid = row_id;

  -- Update users_points table (new)
  -- We use INSERT ... ON CONFLICT to handle both new and existing user records
  insert into public.users_points (user_id, total_points, weekly_points, today_points, last_earned_date)
  values (row_id, amount, amount, amount, current_date)
  on conflict (user_id) do update
  set
    total_points = users_points.total_points + amount,
    weekly_points = users_points.weekly_points + amount,
    today_points = case 
      when users_points.last_earned_date = current_date then users_points.today_points + amount
      else amount
    end,
    last_earned_date = current_date;
end;
$$;
