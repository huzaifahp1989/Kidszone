import { NextResponse } from 'next/server';
import { isAdminSessionRequest } from '@/lib/admin-session';
import {
  OCTOBER_HADITH_MAX_MARKS,
  OCTOBER_HADITH_QUESTION_COUNT,
  OCTOBER_HADITH_QUIZ_TABLE,
} from '@/lib/october-hadith-quiz';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminSessionRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasSupabaseServiceRole()) {
    return NextResponse.json({ error: 'A Supabase service-role key is required to review submissions.' }, { status: 503 });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The review could not be read.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'A valid review is required.' }, { status: 400 });
  }

  const review = body as Record<string, unknown>;
  const result = review.result;
  const questionMarks = review.questionMarks;
  const adminNotes = typeof review.adminNotes === 'string' ? review.adminNotes.trim() : '';

  if (result !== 'pass' && result !== 'failed') {
    return NextResponse.json({ error: 'Choose Pass or Failed.' }, { status: 400 });
  }
  if (
    !Array.isArray(questionMarks) ||
    questionMarks.length !== OCTOBER_HADITH_QUESTION_COUNT ||
    questionMarks.some((mark) => !Number.isInteger(mark) || Number(mark) < 0 || Number(mark) > OCTOBER_HADITH_MAX_MARKS)
  ) {
    return NextResponse.json({ error: 'Enter a whole-number mark from 0 to 10 for every answer.' }, { status: 400 });
  }
  if (adminNotes.length > 2000) {
    return NextResponse.json({ error: 'Review notes must be 2,000 characters or fewer.' }, { status: 400 });
  }

  const marksTotal = questionMarks.reduce((total: number, mark) => total + Number(mark), 0);
  const { data, error } = await supabaseAdmin
    .from(OCTOBER_HADITH_QUIZ_TABLE)
    .update({
      question_marks: questionMarks,
      marks_total: marksTotal,
      result,
      admin_notes: adminNotes,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, full_name, age, madrasah, city, answers, question_marks, marks_total, result, admin_notes, submitted_at, reviewed_at')
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Run the October Hadith Quiz migration before reviewing submissions.' }, { status: 503 });
    }
    console.error('[admin/hadith-october-quiz] Could not save review:', error.message);
    return NextResponse.json({ error: 'Could not save the quiz review.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });

  return NextResponse.json({ submission: data });
}
