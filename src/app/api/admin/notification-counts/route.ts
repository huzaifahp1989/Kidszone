import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getErrorMessage, isMissingChatTable } from '@/lib/chat-service';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export type AdminNotificationCounts = {
  chat: number;
  recordings: number;
  competition: number;
  seerah: number;
};

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const counts: AdminNotificationCounts = {
    chat: 0,
    recordings: 0,
    competition: 0,
    seerah: 0,
  };

  try {
    const { count: recordingCount, error: recError } = await supabaseAdmin
      .from('recordings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted');

    if (!recError) counts.recordings = recordingCount || 0;
  } catch {
    /* table may not exist */
  }

  try {
    const { count: compCount, error: compError } = await supabaseAdmin
      .from('masjid_al_aqsa_quiz_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted');

    if (!compError) counts.competition = compCount || 0;
  } catch {
    /* table may not exist */
  }

  try {
    const { count: seerahCount, error: seerahError } = await supabaseAdmin
      .from('seerah_quiz_submissions')
      .select('*', { count: 'exact', head: true })
      .is('reviewed_at', null);

    if (!seerahError) counts.seerah = seerahCount || 0;
  } catch {
    /* table may not exist */
  }

  try {
    const { data: conversations, error: chatError } = await supabaseAdmin
      .from('chat_conversations')
      .select('id, last_message_at')
      .eq('status', 'open')
      .limit(500);

    if (chatError) throw chatError;

    const ids = (conversations || []).map((c) => c.id);
    const newChats = (conversations || []).filter((c) => !c.last_message_at).length;

    let needsReply = 0;
    if (ids.length > 0) {
      const { data: messages } = await supabaseAdmin
        .from('chat_messages')
        .select('conversation_id, sender_type, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false });

      const lastByConvo: Record<string, string> = {};
      for (const msg of messages || []) {
        if (!lastByConvo[msg.conversation_id]) {
          lastByConvo[msg.conversation_id] = msg.sender_type;
        }
      }
      needsReply = Object.values(lastByConvo).filter((t) => t === 'user').length;
    }

    counts.chat = needsReply + newChats;
  } catch (error: unknown) {
    if (!isMissingChatTable(error)) {
      console.error('[admin notification-counts] chat:', getErrorMessage(error));
    }
  }

  return NextResponse.json({ counts });
}
