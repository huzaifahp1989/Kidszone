import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SUBMISSION_STATUS_LABELS, unknownErrorMessage } from '@/lib/written-competition';
import {
  getCompetitionBySlug,
  getUserWrittenSubmission,
  WRITTEN_ANSWERS_TABLE,
} from '@/lib/written-competition-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ exists: false, canSubmit: true, submission: null });

  try {
    const result = await getCompetitionBySlug(slug);
    if (!result.competition) return NextResponse.json({ exists: false, canSubmit: true, submission: null });

    const submission = await getUserWrittenSubmission(result.competition.id, user.id);
    if (!submission) return NextResponse.json({ exists: false, canSubmit: true, submission: null });

    const showScore = ['reviewed', 'approved', 'rejected', 'eligible', 'winner'].includes(submission.status);

    let answers: Array<{
      questionNumber: number;
      questionText: string;
      answerText: string;
      maxMarks: number;
      marksAwarded: number | null;
      adminFeedback: string;
    }> = [];

    if (showScore) {
      const { data: answerRows } = await supabaseAdmin
        .from(WRITTEN_ANSWERS_TABLE)
        .select('question_number, question_text, answer_text, max_marks, marks_awarded, admin_feedback')
        .eq('submission_id', submission.id)
        .order('question_number', { ascending: true });
      answers = (answerRows || []).map((row) => ({
        questionNumber: Number(row.question_number || 0),
        questionText: String(row.question_text || ''),
        answerText: String(row.answer_text || ''),
        maxMarks: Number(row.max_marks || 0),
        marksAwarded: row.marks_awarded == null ? null : Number(row.marks_awarded),
        adminFeedback: String(row.admin_feedback || ''),
      }));
    }

    return NextResponse.json({
      exists: true,
      canSubmit: false,
      submission: {
        id: submission.id,
        status: submission.status,
        statusLabel: SUBMISSION_STATUS_LABELS[submission.status],
        submittedAt: submission.submittedAt,
        totalMarks: showScore ? submission.totalMarks : null,
        maxMarks: showScore ? submission.maxMarks : null,
        percentage: showScore ? submission.percentage : null,
        answers,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: unknownErrorMessage(error) }, { status: 500 });
  }
}
