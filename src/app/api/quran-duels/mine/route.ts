import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || '';
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 25)));
  const authHeader = request.headers.get('authorization');
  let viewerId: string | null = userId.trim();

  if (!viewerId && authHeader?.startsWith('Bearer ')) {
    const { data } = await supabaseAdmin.auth.getUser(authHeader.slice(7).trim());
    viewerId = data.user?.id || null;
  }
  if (!viewerId) {
    return NextResponse.json(
      { error: 'userId or authenticated session is required' },
      { status: 401 }
    );
  }

  const createdPromise = supabaseAdmin
    .from('quran_duels')
    .select('*')
    .eq('creator_id', viewerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  const joinedPromise = supabaseAdmin
    .from('quran_duels')
    .select('*')
    .eq('opponent_id', viewerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const [created, joined] = await Promise.all([
    (async () => {
      try {
        return await createdPromise;
      } catch {
        return { data: [], error: null };
      }
    })(),
    (async () => {
      try {
        return await joinedPromise;
      } catch {
        return { data: [], error: null };
      }
    })(),
  ]);
  const combined = [...((created.data as any[]) || []), ...((joined.data as any[]) || [])];
  combined.sort((a: any, b: any) => {
    const bt = b.created_at instanceof Date ? b.created_at.getTime() : new Date(b.created_at || 0).getTime();
    const at = a.created_at instanceof Date ? a.created_at.getTime() : new Date(a.created_at || 0).getTime();
    return bt - at;
  });
  const rows = combined.slice(0, limit);

  const rowsNormalised = rows.map((r: any) => {
    const created = r.created_at instanceof Date ? r.created_at : new Date(r.created_at || 0);
    return { ...r, created_at: created };
  });

  return NextResponse.json({
    ok: true,
    duels: rowsNormalised.map((r) => serialize(r, viewerId as string)),
  });
}

function serialize(row: any, viewerId: string) {
  const creatorIsViewer = String(row.creator_id) === String(viewerId);
  const opponentIsViewer = row.opponent_id
    ? String(row.opponent_id) === String(viewerId)
    : false;
  const viewerRole = creatorIsViewer ? 'creator' : opponentIsViewer ? 'opponent' : null;
  return {
    id: String(row.id),
    duelCode: String(row.duel_code),
    status: String(row.status),
    difficulty: String(row.difficulty || 'mixed'),
    numQuestions: Number(row.num_questions) || 0,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,

    creator: row.creator_id
      ? {
          id: String(row.creator_id),
          name: String(row.creator_name || 'Anonymous'),
          submitted: !!row.creator_submitted_at,
          correct: viewerRole ? Number(row.creator_correct) || 0 : null,
          pointsAwarded:
            viewerRole && row.status === 'finished'
              ? Number(row.creator_points_awarded) || 0
              : null,
        }
      : null,
    opponent: row.opponent_id
      ? {
          id: String(row.opponent_id),
          name: String(row.opponent_name || 'Challenger'),
          submitted: !!row.opponent_submitted_at,
          correct: viewerRole ? Number(row.opponent_correct) || 0 : null,
          pointsAwarded:
            viewerRole && row.status === 'finished'
              ? Number(row.opponent_points_awarded) || 0
              : null,
        }
      : null,

    winnerId: row.status === 'finished' ? (row.winner_id ? String(row.winner_id) : null) : null,
    isTie: row.status === 'finished' ? !!row.is_tie : null,
    viewerRole,
  };
}
