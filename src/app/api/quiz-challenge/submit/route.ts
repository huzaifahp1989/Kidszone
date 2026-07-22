import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getChallengeQuizConfig, type ChallengeQuestion } from '@/data/challenge-quizzes';
import { requireMatchingUser } from '@/lib/request-auth';
import { isAnswerCorrect } from '@/lib/answer-match';
import {
  loadChallengeQuestions,
  CHALLENGE_ATTEMPTS_TABLE,
  isMissingTableError,
} from '@/lib/challenge-quiz-server';

export const dynamic = 'force-dynamic';

interface ReviewItem {
  id: string;
  prompt: string;
  response: string;
  correct: boolean;
  answer: string;
  explanation: string;
  isBonus: boolean;
}

function buildResult(
  questions: ChallengeQuestion[],
  answers: Record<string, string>,
  passScore: number,
  awardsBadge: boolean
) {
  let score = 0;
  let total = 0;
  let bonusScore = 0;
  let bonusTotal = 0;
  const review: ReviewItem[] = [];

  for (const q of questions) {
    const response = String(answers[q.id] ?? '').trim();
    const correct = isAnswerCorrect(response, q);
    if (q.isBonus) {
      bonusTotal += 1;
      if (correct) bonusScore += 1;
    } else {
      total += 1;
      if (correct) score += 1;
    }
    review.push({
      id: q.id,
      prompt: q.prompt,
      response,
      correct,
      answer: q.answer,
      explanation: q.explanation,
      isBonus: q.isBonus,
    });
  }

  const passed = score >= passScore;
  return { score, total, bonusScore, bonusTotal, passed, awardedBadge: passed && awardsBadge, review };
}

type AttemptRow = {
  score?: number;
  total?: number;
  bonus_score?: number;
  bonus_total?: number;
  passed?: boolean;
  awarded_badge?: boolean;
  answers?: unknown;
};

function attemptToResult(row: AttemptRow) {
  return {
    score: Number(row.score ?? 0),
    total: Number(row.total ?? 0),
    bonusScore: Number(row.bonus_score ?? 0),
    bonusTotal: Number(row.bonus_total ?? 0),
    passed: Boolean(row.passed),
    awardedBadge: Boolean(row.awarded_badge),
    review: Array.isArray(row.answers) ? row.answers : [],
  };
}

function selectAttempt(quizKey: string, userId: string) {
  return supabaseAdmin
    .from(CHALLENGE_ATTEMPTS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('quiz_key', quizKey)
    .maybeSingle();
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const userId = String(body.userId || '').trim();
  const auth = await requireMatchingUser(request, userId);
  if (!auth.ok) return auth.response;

  const config = getChallengeQuizConfig(String(body.quiz || ''));
  if (!config) return NextResponse.json({ error: 'Unknown quiz' }, { status: 400 });

  const answers = (body.answers && typeof body.answers === 'object' ? body.answers : {}) as Record<string, string>;
  const durationSeconds = Number(body.durationSeconds ?? 0) || 0;
  const autoSubmitted = Boolean(body.autoSubmitted);

  const { questions } = await loadChallengeQuestions(config.key);
  const result = buildResult(questions, answers, config.passScore, config.awardsBadge);

  // Enforce ONE attempt per child. If they already completed it, return the stored result.
  const { data: existing, error: existingError } = await selectAttempt(config.key, userId);
  if (existingError && !isMissingTableError(existingError)) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({
      alreadyCompleted: true,
      persisted: true,
      result: attemptToResult(existing as AttemptRow),
      review: Array.isArray((existing as AttemptRow).answers) ? (existing as AttemptRow).answers : result.review,
    });
  }
  // If the attempts table is missing, still return the score so the child sees results.
  if (isMissingTableError(existingError)) {
    return NextResponse.json({ alreadyCompleted: false, persisted: false, result, review: result.review });
  }

  // Look up name/email for the leaderboard display.
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('name,email')
    .eq('uid', userId)
    .maybeSingle();

  const insertPayload = {
    user_id: userId,
    quiz_key: config.key,
    user_name: (userRow as { name?: string } | null)?.name ?? null,
    email: (userRow as { email?: string } | null)?.email ?? auth.user.email ?? null,
    score: result.score,
    total: result.total,
    bonus_score: result.bonusScore,
    bonus_total: result.bonusTotal,
    passed: result.passed,
    awarded_badge: result.awardedBadge,
    auto_submitted: autoSubmitted,
    duration_seconds: durationSeconds,
    answers: result.review,
  };

  const { error: insertError } = await supabaseAdmin.from(CHALLENGE_ATTEMPTS_TABLE).insert(insertPayload);

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: dup } = await selectAttempt(config.key, userId);
      return NextResponse.json({
        alreadyCompleted: true,
        persisted: true,
        result: dup ? attemptToResult(dup as AttemptRow) : result,
        review: dup && Array.isArray((dup as AttemptRow).answers) ? (dup as AttemptRow).answers : result.review,
      });
    }
    if (isMissingTableError(insertError)) {
      return NextResponse.json({ alreadyCompleted: false, persisted: false, result, review: result.review });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ alreadyCompleted: false, persisted: true, result, review: result.review });
}
