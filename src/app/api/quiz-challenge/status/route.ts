import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { isChallengeQuizKey, getChallengeQuizConfig } from '@/data/challenge-quizzes';
import { CHALLENGE_ATTEMPTS_TABLE, isMissingTableError } from '@/lib/challenge-quiz-server';
import { MANUAL_SUBMISSIONS_TABLE } from '@/lib/manual-quiz-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const quiz = searchParams.get('quiz') || '';
  if (!isChallengeQuizKey(quiz)) return NextResponse.json({ error: 'Unknown quiz' }, { status: 400 });

  const config = getChallengeQuizConfig(quiz);

  // For manual-review quizzes (aug-2026-mixed etc.), check manual_quiz_submissions
  // instead of the auto-graded attempts table, so the UI blocks re-submits and
  // shows the proper "submitted / under review" state.
  if (config?.manualReview) {
    try {
      const { data, error } = await supabaseAdmin
        .from(MANUAL_SUBMISSIONS_TABLE)
        .select('id, status, points_awarded, max_points_available, submitted_at, reviewed_at')
        .eq('user_id', user.id)
        .eq('quiz_key', quiz)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (error) {
        if (isMissingTableError(error)) {
          return NextResponse.json({ completed: false, manualTableMissing: true });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ completed: false });
      }

      const row = data[0] as Record<string, unknown>;
      const status = String(row.status || 'pending');
      const isApproved = status === 'approved';
      const pointsAwarded = Number(row.points_awarded ?? 0);
      const maxPoints = Number(row.max_points_available ?? 0);

      return NextResponse.json({
        completed: true,
        manualReview: true,
        manualStatus: status,
        result: {
          score: isApproved ? pointsAwarded : 0,
          total: maxPoints,
          bonusScore: 0,
          bonusTotal: 0,
          passed: isApproved && maxPoints > 0 ? pointsAwarded >= Math.round(maxPoints * 0.75) : false,
          awardedBadge: isApproved,
          review: [],
          completedAt: row.submitted_at ? String(row.submitted_at) : null,
        },
      });
    } catch (e) {
      return NextResponse.json({ completed: false });
    }
  }

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
