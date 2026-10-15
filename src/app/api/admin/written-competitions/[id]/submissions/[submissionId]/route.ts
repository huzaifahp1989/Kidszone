import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  listAllQuestions,
  mapAnswer,
  mapSubmission,
  recalculateSubmission,
  WRITTEN_ANSWERS_TABLE,
  WRITTEN_SUBMISSIONS_TABLE,
} from '@/lib/written-competition-server';

export const dynamic = 'force-dynamic';

async function loadDetail(submissionId: string) {
  const { data: submissionRow, error } = await supabaseAdmin
    .from(WRITTEN_SUBMISSIONS_TABLE)
    .select('*')
    .eq('id', submissionId)
    .maybeSingle();
  if (error) throw error;
  if (!submissionRow) return null;

  const submission = mapSubmission(submissionRow as Record<string, unknown>);
  const questions = await listAllQuestions(submission.competitionId);
  const questionById = new Map(questions.map((question) => [question.id, question]));

  const { data: answerRows, error: answersError } = await supabaseAdmin
    .from(WRITTEN_ANSWERS_TABLE)
    .select('*')
    .eq('submission_id', submissionId)
    .order('question_number', { ascending: true });
  if (answersError) throw answersError;

  const answers = (answerRows || []).map((row) => {
    const mapped = mapAnswer(row as Record<string, unknown>, questionById.get(String(row.question_id)));
    return mapped;
  });

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('uid, name, email, username, age, city, contact_number, contactnumber, madrasahname, madrasahName, family_email')
    .eq('uid', submission.userId)
    .maybeSingle();

  return { submission, answers, profile: userRow || null };
}

export async function GET(request: Request, context: { params: Promise<{ id: string; submissionId: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { submissionId } = await context.params;
  try {
    const detail = await loadDetail(submissionId);
    if (!detail) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

    if (detail.submission.status === 'pending_review') {
      await supabaseAdmin
        .from(WRITTEN_SUBMISSIONS_TABLE)
        .update({ status: 'under_review', updated_at: new Date().toISOString() })
        .eq('id', submissionId)
        .eq('status', 'pending_review');
      detail.submission.status = 'under_review';
    }

    return NextResponse.json(detail);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; submissionId: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, submissionId } = await context.params;
  const reviewer = (await getAuthenticatedRequestUser(request))?.email || 'admin';

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action || 'save_later');

    if (action === 'mark') {
      const answerId = String(body.answerId || '').trim();
      if (!answerId) return NextResponse.json({ error: 'answerId is required' }, { status: 400 });
      const marksAwarded = Math.max(0, Math.trunc(Number(body.marksAwarded)));
      const { data: answerRow, error: answerError } = await supabaseAdmin
        .from(WRITTEN_ANSWERS_TABLE)
        .select('max_marks')
        .eq('id', answerId)
        .maybeSingle();
      if (answerError) throw answerError;
      const maxMarks = Number(answerRow?.max_marks || 10);
      if (marksAwarded > maxMarks) {
        return NextResponse.json({ error: `Marks cannot exceed ${maxMarks}.` }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from(WRITTEN_ANSWERS_TABLE)
        .update({
          marks_awarded: marksAwarded,
          admin_feedback: String(body.adminFeedback || ''),
          judged_at: new Date().toISOString(),
        })
        .eq('id', answerId);
      if (error) throw error;

      await supabaseAdmin
        .from(WRITTEN_SUBMISSIONS_TABLE)
        .update({ status: 'under_review', updated_at: new Date().toISOString() })
        .eq('id', submissionId)
        .in('status', ['pending_review', 'under_review']);

      await recalculateSubmission(submissionId);
      return NextResponse.json(await loadDetail(submissionId));
    }

    const { data: currentRow, error: currentError } = await supabaseAdmin
      .from(WRITTEN_SUBMISSIONS_TABLE)
      .select('*')
      .eq('id', submissionId)
      .eq('competition_id', id)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!currentRow) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

    const scored = await recalculateSubmission(submissionId);
    const { data: competition } = await supabaseAdmin
      .from('written_competitions')
      .select('min_score_required')
      .eq('id', id)
      .maybeSingle();
    const minScore = Number(competition?.min_score_required || 0);

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      admin_notes: body.adminNotes != null ? String(body.adminNotes) : scored.adminNotes,
      reviewed_by: reviewer,
      updated_at: now,
    };

    if (action === 'approve') {
      const eligible = scored.totalMarks >= minScore;
      patch.status = eligible ? 'eligible' : 'approved';
      patch.reviewed_at = now;
    } else if (action === 'reject') {
      patch.status = 'rejected';
      patch.reviewed_at = now;
    } else {
      patch.status = scored.status === 'reviewed' ? 'reviewed' : 'under_review';
    }

    const { error: updateError } = await supabaseAdmin.from(WRITTEN_SUBMISSIONS_TABLE).update(patch).eq('id', submissionId);
    if (updateError) throw updateError;

    return NextResponse.json(await loadDetail(submissionId));
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
