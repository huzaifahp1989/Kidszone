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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const duelCode = url.searchParams.get('duelCode');
  const duelId = url.searchParams.get('duelId');
  const userId = url.searchParams.get('userId') || '';

  if (!duelCode && !duelId) {
    return NextResponse.json({ error: 'duelCode or duelId is required' }, { status: 400 });
  }

  let viewerId: string | null = userId.trim();
  const authHeader = request.headers.get('authorization');
  if (!viewerId && authHeader?.startsWith('Bearer ')) {
    const { data } = await supabaseAdmin.auth.getUser(authHeader.slice(7).trim());
    viewerId = data.user?.id || null;
  }
  if (!viewerId) {
    return NextResponse.json({ error: 'userId / session is required' }, { status: 401 });
  }

  const query = supabaseAdmin.from('quran_duels').select('*');
  if (duelCode) query.eq('duel_code', String(duelCode).trim().toUpperCase());
  else query.eq('id', String(duelId));

  const { data: row, error } = await query.maybeSingle();
  if (error || !row) {
    return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  }

  if (String(row.creator_id) !== viewerId && String(row.opponent_id || '') !== viewerId) {
    return NextResponse.json(
      { error: 'This duel is private between its two players.' },
      { status: 403 }
    );
  }

  const expired =
    !row.finished_at &&
    row.status !== 'cancelled' &&
    row.expires_at &&
    new Date(row.expires_at).getTime() < Date.now();
  if (expired && row.status !== 'expired' && row.status !== 'finished') {
    await supabaseAdmin.from('quran_duels').update({ status: 'expired' }).eq('id', row.id);
    (row as any).status = 'expired';
  }

  const viewerRole =
    String(row.creator_id) === viewerId
      ? 'creator'
      : String(row.opponent_id) === viewerId
        ? 'opponent'
        : null;
  const alreadySubmitted =
    viewerRole === 'creator'
      ? !!row.creator_submitted_at
      : viewerRole === 'opponent'
        ? !!row.opponent_submitted_at
        : false;

  let questions: any[] = [];
  if (!alreadySubmitted && viewerRole) {
    const agePool = getAllAgeSpecificQuizPools() as any[];
    const mainPool = getQuizQuestionPool().filter((q) => q && q.id) as any[];
    const seenIds = new Set<string>();
    const combined: any[] = [];
    for (const q of [...agePool, ...mainPool]) {
      const id = String(q.id);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      combined.push(q);
    }

    const difficulty = (['easy', 'medium', 'hard', 'mixed'] as const).includes(row.difficulty)
      ? (row.difficulty as Difficulty)
      : 'mixed';
    const byId = new Map(combined.map((q) => [String(q.id), q]));
    const ordered = ((row.question_ids || []) as string[])
      .map((id) => byId.get(String(id)))
      .filter(Boolean) as any[];

    if (ordered.length < Math.min(5, Number(row.num_questions) || 0)) {
      const filler = filterPoolByDifficulty(
        filterQuestionsByTopic(combined, 'quran'),
        difficulty
      );
      const picked = getTopicQuizQuestions(
        filler,
        'quran',
        String(row.question_seed || Date.now().toString()),
        Number(row.num_questions) || 10,
        {}
      );
      for (const q of picked) {
        if (ordered.length >= Number(row.num_questions)) break;
        if (!ordered.find((o) => String(o.id) === String(q.id))) ordered.push(q);
      }
    }

    const rotationSeed = buildOptionRotationSeed({
      daySeed: String(row.question_seed),
      userId: viewerId,
      topicId: `duel-${String(row.id)}`,
    });
    questions = ordered
      .map((q) => rotateQuestionOptions(q as any, rotationSeed))
      .map((q: any) => ({
        id: String(q.id),
        question: q.question_text || q.question,
        options: q.options,
        difficulty: q.difficulty,
        surah: q.surah || undefined,
        reference: q.reference || undefined,
        story: q.story || undefined,
        explanation: q.explanation || undefined,
        didYouKnow: q.didYouKnow || undefined,
      }));
  }

  return NextResponse.json({
    ok: true,
    duel: serializeDuel(row as any, viewerId),
    viewerRole,
    viewerQuestions: questions,
    mySubmission: getMySubmission(row as any, viewerRole),
  });
}

function getMySubmission(row: any, viewerRole: 'creator' | 'opponent' | null) {
  if (!viewerRole) return null;
  if (viewerRole === 'creator') {
    return row.creator_submitted_at
      ? {
          submittedAt: new Date(row.creator_submitted_at).toISOString(),
          correct: Number(row.creator_correct) || 0,
          durationSeconds: Number(row.creator_duration_seconds) || 0,
        }
      : null;
  }
  return row.opponent_submitted_at
    ? {
        submittedAt: new Date(row.opponent_submitted_at).toISOString(),
        correct: Number(row.opponent_correct) || 0,
        durationSeconds: Number(row.opponent_duration_seconds) || 0,
      }
    : null;
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
