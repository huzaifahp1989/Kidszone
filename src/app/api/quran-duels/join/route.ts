import { NextResponse, NextRequest } from 'next/server';
import { requireMatchingUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  filterQuestionsByTopic,
  getTopicQuizQuestions,
} from '@/lib/quiz-topics';
import { getAllAgeSpecificQuizPools } from '@/lib/age-quiz-pool';
import { getQuizQuestionPool } from '@/lib/quiz-question-pool';
import { buildOptionRotationSeed, rotateQuestionOptions } from '@/lib/quiz-option-rotation';

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

function filterPoolByDifficulty<T extends { difficulty?: string | null }>(
  pool: T[],
  difficulty: Difficulty
): T[] {
  if (difficulty === 'mixed') return pool;
  const key =
    difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Hard';
  return pool.filter((q) => (q.difficulty || '') === key);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const auth = await requireMatchingUser(request, body.userId);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  const duelCode = String(body.duelCode || '').trim().toUpperCase();
  const duelId = String(body.duelId || '').trim();
  if (!duelCode && !duelId) {
    return NextResponse.json({ error: 'duelCode or duelId is required' }, { status: 400 });
  }

  const query = supabaseAdmin.from('quran_duels').select('*');
  if (duelCode) query.eq('duel_code', duelCode);
  else query.eq('id', duelId);
  const { data: row, error } = await query.maybeSingle();
  if (error || !row) {
    return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  }

  if (String(row.creator_id) === userId) {
    return NextResponse.json(
      { error: 'You are already the creator of this duel.' },
      { status: 400 }
    );
  }

  let updates: any = {};
  if (!row.opponent_id) {
    updates.opponent_id = userId;
    let opponentName = String(body.userName || '').trim().slice(0, 60);
    if (!opponentName) {
      try {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('name, display_name')
          .eq('uid', userId)
          .maybeSingle();
        opponentName = (
          (userRow as any)?.display_name ||
          (userRow as any)?.name ||
          userId.slice(0, 6)
        )
          .toString()
          .slice(0, 60);
      } catch {
        opponentName = userId.slice(0, 6);
      }
    }
    updates.opponent_name = opponentName;
    if (row.status === 'waiting') updates.status = 'in_progress';
  } else if (String(row.opponent_id) !== userId) {
    return NextResponse.json(
      { error: 'This duel already has an opponent.' },
      { status: 409 }
    );
  }

  let refreshed = row;
  if (Object.keys(updates).length) {
    const { data: updated, error: updErr } = await supabaseAdmin
      .from('quran_duels')
      .update(updates)
      .eq('id', row.id)
      .select()
      .maybeSingle();
    if (updErr || !updated) {
      return NextResponse.json(
        { error: 'Could not join duel: ' + (updErr?.message || 'unknown') },
        { status: 500 }
      );
    }
    refreshed = updated as any;
  }

  return NextResponse.json({
    ok: true,
    duel: serializeDuel(refreshed as any, userId),
  });
}

function serializeDuel(row: any, viewerId: string) {
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
