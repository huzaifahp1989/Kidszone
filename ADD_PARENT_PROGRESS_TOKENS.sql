-- One-time parent progress access tokens
create table if not exists parent_progress_tokens (
  id uuid default gen_random_uuid() primary key,
  token_hash text not null unique,
  child_user_id uuid references auth.users(id) on delete cascade not null,
  parent_email text not null,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists idx_parent_progress_tokens_child on parent_progress_tokens(child_user_id);
create index if not exists idx_parent_progress_tokens_expires on parent_progress_tokens(expires_at);

alter table parent_progress_tokens enable row level security;

drop policy if exists "Service role manages parent progress tokens" on parent_progress_tokens;
create policy "Service role manages parent progress tokens"
  on parent_progress_tokens
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

grant all on parent_progress_tokens to service_role;
