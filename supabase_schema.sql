-- Stories Table
create table if not exists stories (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  summary text not null,
  content text,
  age_min int not null default 5,
  age_max int not null default 12,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for stories
alter table stories enable row level security;

-- Policy: Anyone can read active stories
create policy "Anyone can read active stories"
  on stories for select
  using (is_active = true);

-- Policy: Only admins can insert/update/delete (Assumes admin role or service role usage)
-- (Skipping specific admin policies as simple setup implies service role for admin tasks)


-- Recordings Table
create table if not exists recordings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  story_id uuid references stories not null,
  audio_path text not null,
  duration int not null,
  status text default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  points_awarded int default 0,
  admin_feedback text,
  is_published boolean default false,
  approved_at timestamp with time zone,
  approved_by uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for recordings
alter table recordings enable row level security;

-- Policy: Users can insert their own recordings
create policy "Users can insert own recordings"
  on recordings for insert
  with check (auth.uid() = user_id);

-- Policy: Users can view their own recordings
create policy "Users can view own recordings"
  on recordings for select
  using (auth.uid() = user_id);

-- Policy: Public can view published recordings (Optional, for gallery)
create policy "Public can view published recordings"
  on recordings for select
  using (is_published = true);


-- Storage Bucket Setup
insert into storage.buckets (id, name, public)
values ('story-recordings', 'story-recordings', true)
on conflict (id) do nothing;

-- Storage Policy: Users can upload to their own folder
create policy "Users can upload own audio"
  on storage.objects for insert
  with check (
    bucket_id = 'story-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage Policy: Users can read their own audio
create policy "Users can read own audio"
  on storage.objects for select
  using (
    bucket_id = 'story-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
  
-- Storage Policy: Public access to read (if public bucket)
-- Or restricted to authenticated users
create policy "Public Read Access"
  on storage.objects for select
  using ( bucket_id = 'story-recordings' );
