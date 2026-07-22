import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isTestModeEmail } from '@/lib/test-mode';
import { isChallengeQuizKey } from '@/data/challenge-quizzes';
import { CHALLENGE_ATTEMPTS_TABLE, RELATION_MISSING } from '@/lib/challenge-quiz-server';

export const dynamic = 'force-dynamic';

const sanitizeName = (name: string | null | undefined, uid?: string | null) => {
  const t = (name ?? '').trim();
  if (!t) return 'Friend';
  if (uid && t === uid) return 'Friend';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
  if (isUuid) return 'Friend';
  return t;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const quiz = searchParams.get('quiz') || '';
  if (!isChallengeQuizKey(quiz)) return NextResponse.json({ error: 'Unknown quiz' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from(CHALLENGE_ATTEMPTS_TABLE)
    .select('user_id,user_name,email,score,total,bonus_score,passed,completed_at')
    .eq('quiz_key', quiz)
    .order('score', { ascending: false })
    .order('bonus_score', { ascending: false })
    .order('completed_at', { ascending: true })
    .limit(100);

  if (error) {
    if (error.code === RELATION_MISSING) {
      return NextResponse.json({ entries: [], tableMissing: true });
    }
    return NextResponse.json({ entries: [], error: error.message }, { status: 500 });
  }

  const entries = (data || [])
    .filter((row: Record<string, unknown>) => !isTestModeEmail(row.email as string | null))
    .map((row: Record<string, unknown>, index: number) => ({
      rank: index + 1,
      uid: String(row.user_id || ''),
      name: sanitizeName(row.user_name as string | null, row.user_id as string | null),
      score: Number(row.score ?? 0),
      total: Number(row.total ?? 0),
      bonusScore: Number(row.bonus_score ?? 0),
      passed: Boolean(row.passed),
      completedAt: row.completed_at ? String(row.completed_at) : null,
    }));

  const res = NextResponse.json({ entries });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}
