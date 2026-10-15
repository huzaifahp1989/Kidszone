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
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';

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

async function bumpBadges(userId: string, delta: number) {
  if (!userId || delta <= 0) return;
  try {
    const { error } = await supabaseAdmin.rpc('increment_user_badges_unsafe', {
      uid_input: userId,
      delta,
    });
    if (!error) return;
  } catch {
      /* fall through */
    }
  try {
    const { data } = await supabaseAdmin
      .from('users_points')
      .select('badges')
      .eq('uid', userId)
      .maybeSingle();
    const nextBadges = Number((data as any)?.badges || 0) + delta;
    await supabaseAdmin
      .from('users_points')
      .update({ badges: nextBadges })
      .eq('uid', userId);
  } catch {
    /* best-effort only */
  }
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

  const answers: Record<string, number> = Object.fromEntries(
    Object.entries(body.answers || {}).map(([k, v]) => [String(k), Number(v)])
  );
  const durationSeconds = Math.max(0, Number(body.durationSeconds) || 0);

  const query = supabaseAdmin.from('quran_duels').select('*');
  if (duelCode) query.eq('duel_code', duelCode);
  else query.eq('id', duelId);
  const { data: row, error } = await query.maybeSingle();
  if (error || !row) {
    return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  }

  const viewerRole =
    String(row.creator_id) === userId
      ? 'creator'
      : String(row.opponent_id) === userId
        ? 'opponent'
        : null;
  if (!viewerRole) {
    return NextResponse.json(
      { error: 'Only players of this duel can submit answers.' },
      { status: 403 }
    );
  }
  if (
    row.status === 'expired' || row.status === 'cancelled' || row.status === 'finished') {
    return NextResponse.json(
      { error: `Duel is already ${row.status}` },
      { status: 409 }
    );
  }
  if (viewerRole === 'creator' && row.creator_submitted_at) {
    return NextResponse.json({ error: 'You already submitted for this duel.' }, { status: 409 });
  }
  if (viewerRole === 'opponent' && row.opponent_submitted_at) {
    return NextResponse.json({ error: 'You already submitted for this duel.' }, { status: 409 });
  }

  // Reconstruct canonical questions with option rotation as the user saw it.
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
  let ordered = ((row.question_ids || []) as string[])
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
    userId,
    topicId: `duel-${String(row.id)}`,
  });
  const rotated = ordered.map((q) => rotateQuestionOptions(q as any, rotationSeed));

  // Score.
  let correct = 0;
  const scoreByQ: Record<string, { correct: boolean; chosen: number; correctIndex: number }> = {};
  for (const q of rotated) {
    const chosen = answers[String(q.id)];
    const isCorrect = Number.isInteger(chosen) && Number(chosen) === Number(q.correctAnswer);
    if (isCorrect) correct += 1;
    scoreByQ[String(q.id)] = {
      correct: !!isCorrect,
      chosen: Number.isInteger(chosen) ? Number(chosen) : -1,
      correctIndex: Number(q.correctAnswer),
    };
  }

  // Apply the submitted answers on role.
  const myPatch: any = {};
  if (viewerRole === 'creator') {
    myPatch.creator_answers = answers as any;
    myPatch.creator_correct = correct;
    myPatch.creator_duration_seconds = durationSeconds;
    myPatch.creator_submitted_at = new Date().toISOString();
  } else {
    myPatch.opponent_answers = answers as any;
    myPatch.opponent_correct = correct;
    myPatch.opponent_duration_seconds = durationSeconds;
    myPatch.opponent_submitted_at = new Date().toISOString();
  }

  // Finalize + awards if both sides submitted.
  const otherSubmitted =
    viewerRole === 'creator'
      ? !!row.opponent_submitted_at
      : !!row.creator_submitted_at;
  let pointsAwarded = 0;
  let badgesAwarded = 0;
  let opponentPointsAwarded = 0;
  let opponentBadgesAwarded = 0;
  let winnerId: string | null = null;
  let isTie = false;

  if (otherSubmitted) {
    const creatorCorrect = viewerRole === 'creator'
      ? correct
      : Number(row.creator_correct) || 0;
    const opponentCorrect = viewerRole === 'opponent'
      ? correct
      : Number(row.opponent_correct) || 0;
    const creatorDur = viewerRole === 'creator'
      ? durationSeconds
      : Number(row.creator_duration_seconds) || 0;
    const opponentDur = viewerRole === 'opponent'
      ? durationSeconds
      : Number(row.opponent_duration_seconds) || 0;

    if (creatorCorrect > opponentCorrect) winnerId = String(row.creator_id);
    else if (opponentCorrect > creatorCorrect) winnerId = String(row.opponent_id);
    else if (creatorDur !== opponentDur) {
      // Tiebreaker: faster wins if both submitted; if tie.
      winnerId = creatorDur < opponentDur
        ? String(row.creator_id)
        : String(row.opponent_id);
    } else {
      isTie = true;
      winnerId = null;
    }

    const WIN_PTS = 30;
    const TIE_PTS = 20;
    const LOSS_PTS = 10;
    const WIN_BADGE = 1;

    const creatorPoints = winnerId === String(row.creator_id)
      ? WIN_PTS
      : isTie
        ? TIE_PTS
        : LOSS_PTS;
    const opponentPoints = winnerId === String(row.opponent_id)
      ? WIN_PTS
      : isTie
        ? TIE_PTS
        : LOSS_PTS;
    const creatorBadges = winnerId === String(row.creator_id) ? WIN_BADGE : 0;
    const opponentBadges = winnerId === String(row.opponent_id) ? WIN_BADGE : 0;

    try {
      const cRes = await awardPointsWithDailyCapByUserId(String(row.creator_id), creatorPoints);
      myPatch.creator_points_awarded = Number(cRes.pointsAwarded || creatorPoints);
    } catch {
      myPatch.creator_points_awarded = creatorPoints;
    }
    try {
      const oRes = await awardPointsWithDailyCapByUserId(
        String(row.opponent_id || ''),
        opponentPoints
      );
      myPatch.opponent_points_awarded = Number(oRes.pointsAwarded || opponentPoints);
    } catch {
      myPatch.opponent_points_awarded = opponentPoints;
    }
    if (creatorBadges) {
      myPatch.creator_badges_awarded = creatorBadges;
      await bumpBadges(String(row.creator_id), creatorBadges);
    }
    if (opponentBadges) {
      myPatch.opponent_badges_awarded = opponentBadges;
      await bumpBadges(String(row.opponent_id || ''), opponentBadges);
    }

    pointsAwarded = viewerRole === 'creator' ? myPatch.creator_points_awarded : myPatch.opponent_points_awarded;
    badgesAwarded = viewerRole === 'creator' ? creatorBadges : opponentBadges;
    opponentPointsAwarded = viewerRole === 'creator' ? myPatch.opponent_points_awarded : myPatch.creator_points_awarded;
    opponentBadgesAwarded = viewerRole === 'creator' ? opponentBadges : creatorBadges;

    myPatch.status = 'finished';
    myPatch.finished_at = new Date().toISOString();
    myPatch.winner_id = winnerId;
    myPatch.is_tie = isTie;
  } else {
    if (row.status === 'waiting') myPatch.status = 'in_progress';
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('quran_duels')
    .update(myPatch)
    .eq('id', row.id)
    .select()
    .maybeSingle();
  if (updErr || !updated) {
    return NextResponse.json(
      { error: 'Submission failed: ' + (updErr?.message || 'unknown') },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    duel: serializeDuel(updated as any, userId),
    myScore: {
      correct,
      total: rotated.length,
      durationSeconds,
      pointsAwarded,
      badgesAwarded,
    },
    opponentScore: otherSubmitted ? {
      correct: viewerRole === 'creator'
        ? Number((updated as any).opponent_correct) || 0
        : Number((updated as any).creator_correct) || 0,
      total: rotated.length,
      pointsAwarded: opponentPointsAwarded,
      badgesAwarded: opponentBadgesAwarded,
    } : null,
    winnerId,
    isTie,
    grading: scoreByQ,
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
