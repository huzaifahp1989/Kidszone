-- Kids Zone engagement: stickers, gallery, daily surprise, avatar, family challenge

create table if not exists kids_zone_stickers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  sticker_id text not null,
  unlocked_at timestamptz not null default timezone('utc'::text, now()),
  unique(user_id, sticker_id)
);

create index if not exists idx_kids_zone_stickers_user on kids_zone_stickers (user_id);

alter table kids_zone_stickers enable row level security;

drop policy if exists "Users can view own stickers" on kids_zone_stickers;
create policy "Users can view own stickers"
  on kids_zone_stickers for select
  using (auth.uid() = user_id);

grant select on kids_zone_stickers to authenticated, anon;
grant all on kids_zone_stickers to service_role;

create table if not exists kids_zone_gallery (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  kind text not null,
  title text not null default '',
  image_data text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_kids_zone_gallery_user on kids_zone_gallery (user_id, created_at desc);

alter table kids_zone_gallery enable row level security;

drop policy if exists "Users can view own gallery" on kids_zone_gallery;
create policy "Users can view own gallery"
  on kids_zone_gallery for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own gallery" on kids_zone_gallery;
create policy "Users can insert own gallery"
  on kids_zone_gallery for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own gallery" on kids_zone_gallery;
create policy "Users can delete own gallery"
  on kids_zone_gallery for delete
  using (auth.uid() = user_id);

grant select, insert, delete on kids_zone_gallery to authenticated;
grant all on kids_zone_gallery to service_role;

create table if not exists kids_zone_daily_surprise (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  claim_date date not null,
  reward_type text not null,
  points_awarded int not null default 0,
  sticker_id text,
  tip_href text,
  tip_label text,
  claimed_at timestamptz not null default timezone('utc'::text, now()),
  unique(user_id, claim_date)
);

create index if not exists idx_kids_zone_daily_surprise_user on kids_zone_daily_surprise (user_id, claim_date desc);

alter table kids_zone_daily_surprise enable row level security;

drop policy if exists "Users can view own daily surprise" on kids_zone_daily_surprise;
create policy "Users can view own daily surprise"
  on kids_zone_daily_surprise for select
  using (auth.uid() = user_id);

grant select on kids_zone_daily_surprise to authenticated, anon;
grant all on kids_zone_daily_surprise to service_role;

create table if not exists kids_zone_avatar (
  user_id uuid references auth.users(id) on delete cascade primary key,
  unlocked_items jsonb not null default '["hat_cap","outfit_tee"]'::jsonb,
  loadout jsonb not null default '{"hat":"hat_cap","outfit":"outfit_tee","prop":"prop_book","room":"room_stars"}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table kids_zone_avatar enable row level security;

drop policy if exists "Users can view own avatar" on kids_zone_avatar;
create policy "Users can view own avatar"
  on kids_zone_avatar for select
  using (auth.uid() = user_id);

grant select on kids_zone_avatar to authenticated, anon;
grant all on kids_zone_avatar to service_role;

create table if not exists kids_zone_family_challenges (
  family_email text primary key,
  week_key text not null,
  target_points int not null default 100,
  progress_points int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table kids_zone_family_challenges enable row level security;

drop policy if exists "Anyone can view family challenges" on kids_zone_family_challenges;
create policy "Anyone can view family challenges"
  on kids_zone_family_challenges for select
  using (true);

grant select on kids_zone_family_challenges to authenticated, anon;
grant all on kids_zone_family_challenges to service_role;
