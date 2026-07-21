-- Track Kids Zone Feature Lab progress (good deeds + mystery challenge) per user per day
create table if not exists kids_zone_feature_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  good_deeds jsonb not null default '[]'::jsonb,
  challenge_roll int not null default 0,
  challenge_id text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique(user_id, date)
);

alter table kids_zone_feature_progress enable row level security;

drop policy if exists "Users can view own feature lab progress" on kids_zone_feature_progress;
create policy "Users can view own feature lab progress"
  on kids_zone_feature_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own feature lab progress" on kids_zone_feature_progress;
create policy "Users can insert own feature lab progress"
  on kids_zone_feature_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own feature lab progress" on kids_zone_feature_progress;
create policy "Users can update own feature lab progress"
  on kids_zone_feature_progress for update
  using (auth.uid() = user_id);

grant all on kids_zone_feature_progress to service_role;
grant all on kids_zone_feature_progress to authenticated;
