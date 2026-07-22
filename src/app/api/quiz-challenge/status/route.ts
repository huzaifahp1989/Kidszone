import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { isChallengeQuizKey } from '@/data/challenge-quizzes';
import { CHALLENGE_ATTEMPTS_TABLE, isMissingTableError } from '@/lib/challenge-quiz-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const quiz = searchParams.get('quiz') || '';
  if (!isChallengeQuizKey(quiz)) return NextResponse.json({ error: 'Unknown quiz' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from(CHALLENGE_ATTEMPTS_TABLE)
    .select('*')
    .eq('user_id', user.id)
    .eq('quiz_key', quiz)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ completed: false, tableMissing: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) return NextResponse.json({ completed: false });

  const row = data as Record<string, unknown>;
  return NextResponse.json({
    completed: true,
    result: {
      score: Number(row.score ?? 0),
      total: Number(row.total ?? 0),
      bonusScore: Number(row.bonus_score ?? 0),
      bonusTotal: Number(row.bonus_total ?? 0),
      passed: Boolean(row.passed),
      awardedBadge: Boolean(row.awarded_badge),
      review: Array.isArray(row.answers) ? row.answers : [],
      completedAt: row.completed_at ? String(row.completed_at) : null,
    },
  });
}
