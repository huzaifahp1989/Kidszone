create table if not exists site_announcements (
  id uuid default gen_random_uuid() primary key,
  text text not null,
  bg_color text not null default '#4f46e5',
  active boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table site_announcements enable row level security;

create policy "Public can read active announcements"
  on site_announcements for select
  using (active = true);
