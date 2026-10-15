import { NextResponse } from 'next/server';
import {
  isOctoberHadithQuizOpen,
  OCTOBER_HADITH_QUIZ_TABLE,
  validateOctoberHadithSubmission,
} from '@/lib/october-hadith-quiz';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';

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
  const { data, error } = await supabaseAdmin
    .from(OCTOBER_HADITH_QUIZ_TABLE)
    .insert({
      full_name: submission.fullName,
      age: submission.age,
      madrasah: submission.madrasah,
      city: submission.city,
      answers: submission.answers,
    })
    .select('id')
    .single();

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

  return NextResponse.json({
    success: true,
    submissionId: data.id,
    message: 'Your answers have been submitted for admin review.',
  }, { status: 201 });
}
