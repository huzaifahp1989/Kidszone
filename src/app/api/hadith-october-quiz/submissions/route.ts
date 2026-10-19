import { NextResponse } from 'next/server';
import {
  isOctoberHadithQuizOpen,
  OCTOBER_HADITH_QUIZ_TABLE,
  validateOctoberHadithSubmission,
} from '@/lib/october-hadith-quiz';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isOctoberHadithQuizOpen()) {
    return NextResponse.json({ error: 'The October Hadith Quiz is closed. Entries were due by 30 October 2026.' }, { status: 410 });
  }
  if (!hasSupabaseServiceRole()) {
    return NextResponse.json({ error: 'Quiz submissions are temporarily unavailable. Please try again later.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The submission could not be read. Please try again.' }, { status: 400 });
  }

  const validated = validateOctoberHadithSubmission(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { submission } = validated;

  // Submitting while signed in links the entry to the learner, so a Failed
  // result can be sent back to them. Anonymous entries are still accepted.
  const learner = await getAuthenticatedRequestUser(request);

  const payload: Record<string, unknown> = {
    full_name: submission.fullName,
    age: submission.age,
    madrasah: submission.madrasah,
    city: submission.city,
    answers: submission.answers,
  };
  if (learner) payload.uid = learner.id;

  let { data, error } = await supabaseAdmin
    .from(OCTOBER_HADITH_QUIZ_TABLE)
    .insert(payload)
    .select('id')
    .single();

  // Older schemas may not have the uid column yet — retry without it.
  if (error?.code === '42703' && learner) {
    delete payload.uid;
    ({ data, error } = await supabaseAdmin
      .from(OCTOBER_HADITH_QUIZ_TABLE)
      .insert(payload)
      .select('id')
      .single());
  }

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json(
        { error: 'The quiz submission table has not been set up yet. Please contact the site administrator.' },
        { status: 503 }
      );
    }
    console.error('[hadith-october-quiz] Submission failed:', error.message);
    return NextResponse.json({ error: 'Your answers could not be submitted. Please try again.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Your answers could not be submitted. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    submissionId: data.id,
    linkedToAccount: Boolean(learner),
    message: 'Your answers have been submitted for admin review.',
  }, { status: 201 });
}
