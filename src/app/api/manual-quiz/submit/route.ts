import { NextResponse } from 'next/server';
import { isChallengeQuizKey, getChallengeQuizConfig } from '@/data/challenge-quizzes';
import { requireMatchingUser } from '@/lib/request-auth';
import { createManualSubmission, isMissingTableError } from '@/lib/manual-quiz-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { MANUAL_SUBMISSIONS_TABLE } from '@/lib/manual-quiz-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const userId = String(body.userId || '').trim();
  const rawQuiz = String(body.quiz || '').trim();
  if (!isChallengeQuizKey(rawQuiz)) {
    return NextResponse.json({ error: 'Unknown quiz' }, { status: 400 });
  }
  const config = getChallengeQuizConfig(rawQuiz);
  if (!config || !config.manualReview) {
    return NextResponse.json({ error: 'Not a manual review quiz' }, { status: 400 });
  }

  const rawAnswers = (body.answers && typeof body.answers === 'object' ? body.answers : []) as Array<{
    questionId?: string;
    questionTopic?: string | null;
    questionPrompt?: string;
    referenceAnswer?: string | null;
    answerText?: string;
    maxPoints?: number;
  }>;

  const userName = body.userName ? String(body.userName) : null;
  const email = body.email ? String(body.email) : null;
  const city = body.city ? String(body.city) : null;
  const age = body.age === null || body.age === undefined ? null : Number(body.age);
  const contactNumber = body.contactNumber ? String(body.contactNumber) : null;
  const deviceInfo = body.deviceInfo ? String(body.deviceInfo) : null;

  if (!Array.isArray(rawAnswers) || rawAnswers.length === 0) {
    return NextResponse.json({ error: 'Answers required' }, { status: 400 });
  }

  const authRes = await requireMatchingUser(request, userId);
  if (!authRes.ok) return authRes.response;

  const existing = await supabaseAdmin
    .from(MANUAL_SUBMISSIONS_TABLE)
    .select('id')
    .eq('user_id', userId)
    .eq('quiz_key', config.key)
    .limit(1);

  if (existing.error && !isMissingTableError(existing.error)) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }
  if (existing.data && existing.data.length > 0) {
    return NextResponse.json(
      { error: 'You already submitted this quiz. Your answers are being reviewed by our team!' },
      { status: 409 }
    );
  }

  const questionLookup: Record<string, { prompt: string; answer: string; topic?: string; points: number }> = {};
  for (const q of config.questions) {
    questionLookup[q.id] = {
      prompt: q.prompt,
      answer: q.answer,
      topic: q.topic,
      points: q.points,
    };
  }

  let maxPointsAvailable = 0;
  const normalizedAnswers = rawAnswers
    .map((a) => {
      const q = questionLookup[String(a.questionId || '')];
      const maxPts = Number(a.maxPoints) || q?.points || 0;
      maxPointsAvailable += maxPts;
      return {
        questionId: String(a.questionId || ''),
        questionTopic: (a.questionTopic ?? q?.topic ?? null) as string | null,
        questionPrompt: String(a.questionPrompt || q?.prompt || ''),
        referenceAnswer: (a.referenceAnswer ?? q?.answer ?? null) as string | null,
        answerText: String(a.answerText || '').trim(),
        maxPoints: maxPts,
      };
    })
    .filter((a) => a.questionId && a.questionPrompt);

  if (normalizedAnswers.length === 0) {
    return NextResponse.json({ error: 'No valid answers provided' }, { status: 400 });
  }

  try {
    const { submissionId } = await createManualSubmission({
      quizKey: config.key,
      userId,
      userName,
      email,
      city,
      age: Number.isFinite(age) ? (age as number) : null,
      contactNumber,
      deviceInfo,
      maxPointsAvailable,
      answers: normalizedAnswers,
    });

    return NextResponse.json({
      submissionId,
      maxPointsAvailable,
      message:
        'JazakAllahu Khayran! Your answers have been submitted successfully. Admins will review and award points shortly.',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Could not submit';
    if (msg.includes('23505') || msg.includes('unique') || msg.toLowerCase().includes('duplicate')) {
      return NextResponse.json(
        { error: 'You already submitted this quiz. Your answers are being reviewed!' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
