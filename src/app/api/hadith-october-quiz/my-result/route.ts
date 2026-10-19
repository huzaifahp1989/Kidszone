import { NextResponse } from 'next/server';
import {
  isOctoberHadithQuizOpen,
  OCTOBER_HADITH_MAX_MARKS,
  OCTOBER_HADITH_QUESTION_COUNT,
  OCTOBER_HADITH_QUIZ_TABLE,
} from '@/lib/october-hadith-quiz';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

/**
 * The signed-in learner's own most recent October Hadith Quiz entry, so the app
 * can tell them they did not pass and offer another attempt.
 */
export async function GET(request: Request) {
  const learner = await getAuthenticatedRequestUser(request);
  if (!learner || !hasSupabaseServiceRole()) {
    return NextResponse.json({ submission: null, quizOpen: isOctoberHadithQuizOpen() });
  }

  const { data, error } = await supabaseAdmin
    .from(OCTOBER_HADITH_QUIZ_TABLE)
    .select('id, result, marks_total, admin_notes, reviewed_at, submitted_at')
    .eq('uid', learner.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // Table missing or the retry migration has not run yet — nothing to show.
    return NextResponse.json({ submission: null, quizOpen: isOctoberHadithQuizOpen() });
  }

  return NextResponse.json({
    submission: {
      id: data.id,
      result: data.result,
      marksTotal: Number(data.marks_total ?? 0),
      maxMarks: OCTOBER_HADITH_MAX_MARKS * OCTOBER_HADITH_QUESTION_COUNT,
      adminNotes: data.admin_notes ?? '',
      reviewedAt: data.reviewed_at,
      submittedAt: data.submitted_at,
    },
    quizOpen: isOctoberHadithQuizOpen(),
  });
}
