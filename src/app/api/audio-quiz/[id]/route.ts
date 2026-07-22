import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  AUDIO_QUIZZES_TABLE,
  AUDIO_SUBMISSIONS_TABLE,
  AUDIO_QUIZ_BUCKET,
  isMissingTableError,
  mapAudioQuiz,
} from '@/lib/audio-quiz-server';
import { getReadableObjectUrl } from '@/lib/object-storage';
import { hasQuizEnded, isQuizOpen } from '@/lib/audio-quiz';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { data, error } = await supabaseAdmin.from(AUDIO_QUIZZES_TABLE).select('*').eq('id', id).maybeSingle();
    if (error) {
      if (isMissingTableError(error)) return NextResponse.json({ error: 'Not set up' }, { status: 404 });
      throw error;
    }
    if (!data) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

    const row = data as Record<string, unknown>;
    const quiz = mapAudioQuiz(row);

    // Resolve a fresh playable URL for the admin-uploaded question audio.
    let questionAudioUrl = quiz.questionAudioUrl;
    if (row.question_audio_path) {
      try {
        questionAudioUrl = await getReadableObjectUrl(AUDIO_QUIZ_BUCKET, String(row.question_audio_path), 86400);
      } catch {
        /* keep stored url */
      }
    }

    const [{ count }, user] = await Promise.all([
      supabaseAdmin
        .from(AUDIO_SUBMISSIONS_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('quiz_id', id),
      getAuthenticatedRequestUser(request).catch(() => null),
    ]);

    let mySubmission: { status: string; submittedAt: string | null } | null = null;
    if (user) {
      const { data: mine } = await supabaseAdmin
        .from(AUDIO_SUBMISSIONS_TABLE)
        .select('status, submitted_at')
        .eq('quiz_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (mine) {
        mySubmission = {
          status: String((mine as Record<string, unknown>).status || 'pending'),
          submittedAt: (mine as Record<string, unknown>).submitted_at
            ? String((mine as Record<string, unknown>).submitted_at)
            : null,
        };
      }
    }

    return NextResponse.json({
      quiz: { ...quiz, questionAudioUrl },
      participantCount: Number(count || 0),
      open: isQuizOpen(quiz),
      ended: hasQuizEnded(quiz),
      hasSubmitted: Boolean(mySubmission),
      mySubmission,
      signedIn: Boolean(user),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
