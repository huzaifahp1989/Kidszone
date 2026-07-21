import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TOTAL_SEERAH_CHAPTERS, getPassStatus } from '@/lib/seerah-course';

const chapters = [1, 2, 3, 4, 5];

const toFinalScore = (row: any) => {
  if (Array.isArray(row?.manual_marks) && row.manual_marks.length > 0) {
    return row.manual_marks.reduce((sum: number, v: number) => sum + Number(v || 0), 0);
  }
  return Number(row?.final_score ?? row?.auto_score ?? 0);
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get('userId') || '').trim();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data: submissions, error } = await supabaseAdmin
      .from('seerah_quiz_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('chapter_number', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          setupRequired: true,
          message: 'Run 20260607_create_seerah_course_tables.sql first.',
          chapters: chapters.map((chapterNumber) => ({
            chapterNumber,
            completed: false,
            passed: false,
            finalScore: 0,
          })),
          completionCount: 0,
          passedCount: 0,
          allCompleted: false,
          allPassed: false,
          certificate: null,
        });
      }
      throw error;
    }

    const byChapter = new Map<number, any>();
    for (const row of submissions || []) {
      byChapter.set(Number(row.chapter_number), row);
    }

    const chapterProgress = chapters.map((chapterNumber) => {
      const row = byChapter.get(chapterNumber);
      if (!row) {
        return {
          chapterNumber,
          completed: false,
          passed: false,
          finalScore: 0,
          submittedAt: null,
          status: null,
          answers: null,
        };
      }

      const finalScore = toFinalScore(row);
      const status = getPassStatus(finalScore);
      return {
        chapterNumber,
        completed: true,
        passed: status === 'passed',
        finalScore,
        submittedAt: row.submitted_at,
        status,
        answers: Array.isArray(row.answers) ? row.answers : [],
      };
    });

    const completionCount = chapterProgress.filter((c) => c.completed).length;
    const passedCount = chapterProgress.filter((c) => c.passed).length;
    const allCompleted = completionCount === TOTAL_SEERAH_CHAPTERS;
    const allPassed = passedCount === TOTAL_SEERAH_CHAPTERS;

    let certificate: any = null;
    if (allCompleted && allPassed) {
      const { data: existingCert } = await supabaseAdmin
        .from('seerah_certificates')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingCert) {
        certificate = existingCert;
      } else {
        const latestSubmission = submissions?.[submissions.length - 1];
        const { data: createdCert } = await supabaseAdmin
          .from('seerah_certificates')
          .insert({
            user_id: userId,
            user_name: latestSubmission?.user_name || null,
            email: latestSubmission?.email || null,
          })
          .select('*')
          .maybeSingle();

        certificate = createdCert || null;
      }
    }

    return NextResponse.json({
      setupRequired: false,
      chapters: chapterProgress,
      completionCount,
      passedCount,
      allCompleted,
      allPassed,
      certificate,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
