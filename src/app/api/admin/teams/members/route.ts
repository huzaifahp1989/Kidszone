import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/** POST: add a learner to a team. body { teamId, userId, role? } */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const teamId = String(body?.teamId || '').trim();
    const userId = String(body?.userId || '').trim();
    if (!teamId || !userId) {
      return NextResponse.json({ error: 'teamId and userId are required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('team_members')
      .upsert({ team_id: teamId, user_id: userId, role: body?.role === 'captain' ? 'captain' : 'member' }, { onConflict: 'user_id' });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Teams table is missing.', setupRequired: true }, { status: 503 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[admin/teams/members POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE: remove a learner from a team. ?teamId=&userId= */
export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const teamId = String(searchParams.get('teamId') || '').trim();
    const userId = String(searchParams.get('userId') || '').trim();
    if (!teamId || !userId) {
      return NextResponse.json({ error: 'teamId and userId are required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error && error.code !== '42P01') throw error;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[admin/teams/members DELETE]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
