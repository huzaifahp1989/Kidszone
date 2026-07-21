-- Live chat: visitors and logged-in users can message; admins reply from dashboard.

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  visitor_token text,
  display_name text not null,
  email text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_conversations_user_id_idx
  on public.chat_conversations (user_id)
  where user_id is not null;

create index if not exists chat_conversations_visitor_token_idx
  on public.chat_conversations (visitor_token)
  where visitor_token is not null;

create index if not exists chat_conversations_last_message_at_idx
  on public.chat_conversations (last_message_at desc nulls last);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'admin')),
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_id_idx
  on public.chat_messages (conversation_id, created_at asc);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- All chat access goes through server API (service role). No public RLS policies.

grant all on public.chat_conversations to service_role;
grant all on public.chat_messages to service_role;
