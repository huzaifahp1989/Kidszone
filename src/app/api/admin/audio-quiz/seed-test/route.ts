import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { AUDIO_QUIZZES_TABLE, isMissingTableError, seedTestAudioQuiz } from '@/lib/audio-quiz-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error: tableError } = await supabaseAdmin.from(AUDIO_QUIZZES_TABLE).select('id').limit(1);
  if (isMissingTableError(tableError)) {
    return NextResponse.json(
      { error: 'Audio Quiz tables are not set up yet. Run setup first.' },
      { status: 503 }
    );
  }

  try {
    const result = await seedTestAudioQuiz();
    return NextResponse.json({
      success: true,
      created: result.created,
      quizId: result.quizId,
      questionCount: result.questionCount,
      message: result.created
        ? 'Test audio quiz created with a sample question.'
        : 'Test audio quiz already exists.',
      playUrl: `/audio-quiz/${result.quizId}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not create test quiz';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
