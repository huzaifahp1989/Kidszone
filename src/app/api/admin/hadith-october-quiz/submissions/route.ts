import { NextResponse } from 'next/server';
import { isAdminSessionRequest } from '@/lib/admin-session';
import { OCTOBER_HADITH_QUESTIONS, OCTOBER_HADITH_QUIZ_TABLE } from '@/lib/october-hadith-quiz';
import { OCTOBER_HADITH_MARKING_GUIDES } from '@/lib/october-hadith-quiz-admin';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminSessionRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasSupabaseServiceRole()) {
    return NextResponse.json({ error: 'A Supabase service-role key is required to review submissions.' }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from(OCTOBER_HADITH_QUIZ_TABLE)
    .select('id, full_name, age, madrasah, city, answers, question_marks, marks_total, result, admin_notes, submitted_at, reviewed_at')
    .order('submitted_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Run the October Hadith Quiz migration before reviewing submissions.' }, { status: 503 });
    }
    console.error('[admin/hadith-october-quiz] Could not load submissions:', error.message);
    return NextResponse.json({ error: 'Could not load quiz submissions.' }, { status: 500 });
  }

  return NextResponse.json(
    {
      submissions: data || [],
      questions: OCTOBER_HADITH_QUESTIONS.map((question) => ({
        ...question,
        markingGuide: OCTOBER_HADITH_MARKING_GUIDES[question.id],
      })),
    },
    { headers: { 'Cache-Control': 'no-store, private' } }
  );
}
