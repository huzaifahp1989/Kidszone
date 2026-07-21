import { supabaseAdmin } from '@/lib/supabase-admin';

export type ChatConversation = {
  id: string;
  user_id: string | null;
  visitor_token: string | null;
  display_name: string;
  email: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'admin';
  body: string;
  created_at: string;
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return '';
}

export function isMissingChatTable(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find the table')
  );
}

export const CHAT_SETUP_SQL = `
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

grant all on public.chat_conversations to service_role;
grant all on public.chat_messages to service_role;
`.trim();

export async function getUserDisplayInfo(userId: string, fallbackEmail?: string | null) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('name, email')
    .eq('uid', userId)
    .maybeSingle();

  const email = data?.email || fallbackEmail || 'unknown@kidszone.local';
  const name = data?.name || (fallbackEmail ? fallbackEmail.split('@')[0] : 'User');

  return { displayName: name, email };
}

export async function loadConversation(conversationId: string): Promise<ChatConversation | null> {
  const { data, error } = await supabaseAdmin
    .from('chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();

  if (error) throw error;
  return data as ChatConversation | null;
}

export function canAccessConversation(
  conversation: ChatConversation,
  userId?: string | null,
  visitorToken?: string | null
): boolean {
  if (userId && conversation.user_id === userId) return true;
  if (visitorToken && conversation.visitor_token === visitorToken) return true;
  return false;
}

export async function touchConversation(conversationId: string) {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from('chat_conversations')
    .update({ last_message_at: now, updated_at: now })
    .eq('id', conversationId);
}

export async function chatTablesExist(): Promise<boolean> {
  const { error } = await supabaseAdmin.from('chat_conversations').select('id').limit(1);
  if (!error) return true;
  if (isMissingChatTable(error)) return false;
  return true;
}
