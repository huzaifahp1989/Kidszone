create table if not exists public.user_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text not null,
  url text null,
  source text not null default 'admin_message',
  sent_by text not null default 'admin',
  campaign_id text null,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_messages_user_created_idx on public.user_messages(user_id, created_at desc);
create index if not exists user_messages_unread_idx on public.user_messages(user_id, read_at);

alter table public.user_messages enable row level security;

drop policy if exists user_messages_select_own on public.user_messages;
create policy user_messages_select_own
  on public.user_messages
  for select
  using (auth.uid() = user_id);

drop policy if exists user_messages_update_own on public.user_messages;
create policy user_messages_update_own
  on public.user_messages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_messages_insert_admin on public.user_messages;
create policy user_messages_insert_admin
  on public.user_messages
  for insert
  with check (true);
