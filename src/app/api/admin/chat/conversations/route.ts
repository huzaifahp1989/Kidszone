import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { isMissingChatTable } from '@/lib/chat-service';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: conversations, error } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const ids = (conversations || []).map((c) => c.id);
    let lastMessages: Record<string, { body: string; sender_type: string; created_at: string }> = {};

    if (ids.length > 0) {
      const { data: messages } = await supabaseAdmin
        .from('chat_messages')
        .select('conversation_id, body, sender_type, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false });

      for (const msg of messages || []) {
        if (!lastMessages[msg.conversation_id]) {
          lastMessages[msg.conversation_id] = {
            body: msg.body,
            sender_type: msg.sender_type,
            created_at: msg.created_at,
          };
        }
      }
    }

    const enriched = (conversations || []).map((c) => ({
      ...c,
      lastMessage: lastMessages[c.id] || null,
      needsReply: lastMessages[c.id]?.sender_type === 'user',
    }));

    return NextResponse.json({ conversations: enriched });
  } catch (error: unknown) {
    if (isMissingChatTable(error)) {
      return NextResponse.json({ error: 'Chat tables not set up. Run the migration.', setupRequired: true }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : 'Failed to load conversations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
