import { NextResponse } from 'next/server';
import { requireMatchingUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  answerTextForQuestion,
  DEFAULT_WRITTEN_SLUG,
  isWrittenCompetitionOpen,
  unknownErrorMessage,
} from '@/lib/written-competition';
import {
  getCompetitionBySlug,
  getUserWrittenSubmission,
  listActiveQuestions,
  mapSubmission,
  seedRabiUlAwwalCompetition,
  WRITTEN_SUBMISSION_ALREADY_EXISTS,
  WRITTEN_ANSWERS_TABLE,
  WRITTEN_SUBMISSIONS_TABLE,
} from '@/lib/written-competition-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const auth = await requireMatchingUser(request, String(body.userId || ''));
    if (!auth.ok) return auth.response;

    const result = await getCompetitionBySlug(slug);
    if (result.tableMissing) {
      return NextResponse.json({ error: 'Competition is not set up yet.' }, { status: 503 });
    }
    if (!result.competition) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    if (!isWrittenCompetitionOpen(result.competition)) {
      return NextResponse.json({ error: 'This competition is not open for submissions.' }, { status: 403 });
    }

    const existing = await getUserWrittenSubmission(result.competition.id, auth.userId);
    if (existing) {
      return NextResponse.json({ error: WRITTEN_SUBMISSION_ALREADY_EXISTS }, { status: 409 });
    }

    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('name, email, age, city, contact_number, contactnumber, contactNumber, family_email')
      .eq('uid', auth.userId)
      .maybeSingle();

    let questions = await listActiveQuestions(result.competition.id);
    if (questions.length === 0 && slug === DEFAULT_WRITTEN_SLUG) {
      await seedRabiUlAwwalCompetition().catch(() => null);
      questions = await listActiveQuestions(result.competition.id);
    }
    if (questions.length === 0) {
      return NextResponse.json({ error: 'No active questions have been added yet.' }, { status: 400 });
    }

    const answersInput = body.answers && typeof body.answers === 'object' ? (body.answers as Record<string, unknown>) : {};
    const maxLen = result.competition.maxAnswerLength;

    const answerRows = questions.map((question) => {
      const text = answerTextForQuestion(answersInput, question).slice(0, maxLen);
      return {
        question_id: question.id,
        question_number: question.questionNumber,
        question_text: question.questionText,
        answer_text: text,
        max_marks: question.maxMarks,
      };
    });

    const answered = answerRows.filter((row) => row.answer_text.length > 0).length;
    if (answered === 0) {
      return NextResponse.json({ error: 'Please write at least one answer before submitting.' }, { status: 400 });
    }

    const maxMarks = questions.reduce((sum, question) => sum + question.maxMarks, 0);
    const contact =
      String(userRow?.contact_number || userRow?.contactnumber || (userRow as { contactNumber?: string } | null)?.contactNumber || '').trim();

    const { data: submission, error: submitError } = await supabaseAdmin
      .from(WRITTEN_SUBMISSIONS_TABLE)
      .insert({
        competition_id: result.competition.id,
        user_id: auth.userId,
        user_name: String(body.userName || userRow?.name || '').trim(),
        email: String(body.email || userRow?.email || userRow?.family_email || auth.user.email || '').trim(),
        city: String(body.city || userRow?.city || '').trim(),
        age: userRow?.age == null ? null : Number(userRow.age),
        contact_number: contact,
        status: 'pending_review',
        total_marks: 0,
        max_marks: maxMarks,
        percentage: 0,
      })
      .select('*')
      .single();
    if (submitError) {
      if (submitError.code === '23505') {
        return NextResponse.json({ error: WRITTEN_SUBMISSION_ALREADY_EXISTS }, { status: 409 });
      }
      throw submitError;
    }

    const { error: answersError } = await supabaseAdmin.from(WRITTEN_ANSWERS_TABLE).insert(
      answerRows.map((row) => ({ ...row, submission_id: submission.id }))
    );
    if (answersError) throw answersError;

    return NextResponse.json({
      success: true,
      submission: mapSubmission(submission as Record<string, unknown>),
      message: 'Your answers were submitted for admin review. You will not be able to change them.',
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: unknownErrorMessage(error) }, { status: 500 });
  }
}
