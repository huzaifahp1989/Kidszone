import { NextResponse, NextRequest } from 'next/server';
import { requireMatchingUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  filterQuestionsByTopic,
  getTopicQuizQuestions,
  getDailyTopicSeed,
} from '@/lib/quiz-topics';
import {
  getAllAgeSpecificQuizPools,
} from '@/lib/age-quiz-pool';
import { getQuizQuestionPool } from '@/lib/quiz-question-pool';
import { buildOptionRotationSeed, rotateQuestionOptions } from '@/lib/quiz-option-rotation';

const DEFAULT_NUM_QUESTIONS = 10;

function buildDuelCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

type DuelDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

function filterPoolByDifficulty<T extends { difficulty?: string | null }>(
  pool: T[],
  difficulty: DuelDifficulty
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

  const { user, userId } = auth;
  const difficulty = (['easy', 'medium', 'hard', 'mixed'] as const).includes(
    body.difficulty
  )
    ? (body.difficulty as DuelDifficulty)
    : 'mixed';
  const numQuestions = Math.min(
    20,
    Math.max(5, Number(body.numQuestions) || DEFAULT_NUM_QUESTIONS)
  );

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

  const quranPool = filterPoolByDifficulty(
    filterQuestionsByTopic(combined, 'quran'),
    difficulty
  );
  const seed = `${Date.now()}:${userId}:${Math.random().toString(36).slice(2, 10)}`;
  const picked = getTopicQuizQuestions(quranPool, 'quran', seed, numQuestions, {});
  if (picked.length < Math.min(5, numQuestions)) {
    return NextResponse.json(
      { error: 'Not enough Quran questions available for this difficulty.' },
      { status: 400 }
    );
  }
  const questionIds = picked.map((q) => String(q.id));

  let duelCode = buildDuelCode();
  for (let i = 0; i < 6; i++) {
    const { count }: any = await supabaseAdmin
      .from('quran_duels')
      .select('*', { count: 'exact', head: true })
      .eq('duel_code', duelCode);
    if (!count) break;
    duelCode = buildDuelCode();
  }

  const userName = String(body.userName || '');
  const row: any = {
    duel_code: duelCode,
    creator_id: userId,
    creator_name: userName.trim().slice(0, 60) || null,
    question_ids: questionIds,
    question_seed: seed,
    difficulty,
    num_questions: picked.length,
  };
  if (!row.creator_name) {
    try {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('name, display_name')
        .eq('uid', userId)
        .maybeSingle();
      row.creator_name = (
        (userRow as any)?.display_name || (userRow as any)?.name || user.id.slice(0, 6)
      ).toString().slice(0, 60);
    } catch {
      row.creator_name = user.id.slice(0, 6);
    }
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('quran_duels')
    .insert(row)
    .select()
    .maybeSingle();
  if (error || !inserted) {
    return NextResponse.json(
      { error: 'Could not create duel: ' + (error?.message || 'unknown') },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    duel: serializeDuel(inserted as any, userId),
    _authDebug: { hasUser: !!user, userHash: userId.slice(0, 6) },
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
