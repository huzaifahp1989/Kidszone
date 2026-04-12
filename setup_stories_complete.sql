-- 1. Create Stories Table (if not exists)
create table if not exists stories (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  summary text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Force add columns (Idempotent)
-- We use IF NOT EXISTS to avoid errors if they already exist
alter table stories add column if not exists content text;
alter table stories add column if not exists age_min int not null default 5;
alter table stories add column if not exists age_max int not null default 12;
alter table stories add column if not exists is_active boolean default true;

-- 3. Add Unique Constraint on Title
-- We drop it first to ensure we can recreate it cleanly, or use a do block
do $$ 
begin
  if not exists (select 1 from pg_constraint where conname = 'stories_title_key') then
    alter table stories add constraint stories_title_key unique (title);
  end if;
end $$;

-- 4. Enable RLS
alter table stories enable row level security;

-- 5. Create Policies (Drop first to avoid conflicts)
drop policy if exists "Public stories are viewable by everyone" on stories;
create policy "Public stories are viewable by everyone"
  on stories for select
  using ( true );

drop policy if exists "Admins can insert stories" on stories;
create policy "Admins can insert stories"
  on stories for insert
  with check ( auth.role() = 'service_role' );

drop policy if exists "Admins can update stories" on stories;
create policy "Admins can update stories"
  on stories for update
  using ( auth.role() = 'service_role' );

-- 6. Insert Default Stories (Seeding)
insert into stories (title, summary, content, age_min, age_max)
values 
  ('The Honest Merchant', 'A story about the importance of honesty in business.', 'Once upon a time, there was a merchant who always told the truth. Even when he could make more money by lying about his goods, he refused. One day, a man came to buy a camel. The merchant showed him a camel but pointed out a small limp it had. "Why did you tell me?" asked the buyer. "Because honesty is better than gold," replied the merchant. The buyer was so impressed that he bought the camel and told everyone about the honest merchant.', 6, 10),
  ('The Crying Camel', 'How the Prophet (PBUH) showed kindness to animals.', 'One day, the Prophet Muhammad (PBUH) entered a garden and saw a camel. When the camel saw the Prophet, it started to cry. The Prophet went to the camel, wiped its tears, and patted it gently. He asked, "Who owns this camel?" A young man came forward. The Prophet told him, "Fear Allah with regard to this animal! It has complained to me that you starve it and overwork it." The young man promised to treat the camel better from that day on.', 5, 9)
on conflict (title) do update 
set content = excluded.content;

-- 7. Fix Recordings Relationship for Admin Panel (REQUIRED FOR RECORDINGS PAGE)
-- This ensures we can join recordings with the public.users table
do $$
begin
  -- Only run if recordings table exists
  if exists (select 1 from information_schema.tables where table_name = 'recordings') then
      begin
        -- Try to add the foreign key to public.users
        alter table recordings 
        add constraint recordings_user_id_fkey_profiles 
        foreign key (user_id) 
        references public.users (uid);
      exception when duplicate_object then
        null; -- Ignore if it already exists
      when others then
        raise notice 'Error adding constraint: %', SQLERRM;
      end;
  end if;
end $$;
