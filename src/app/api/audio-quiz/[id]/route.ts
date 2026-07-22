import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  AUDIO_QUIZZES_TABLE,
  AUDIO_QUESTIONS_TABLE,
  AUDIO_SUBMISSIONS_TABLE,
  AUDIO_QUIZ_BUCKET,
  isMissingTableError,
  mapAudioQuiz,
  mapAudioQuestion,
  resolveAnswerUrl,
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

    // Resolve a fresh playable URL for the admin-uploaded question audio (legacy single question).
    let questionAudioUrl = quiz.questionAudioUrl;
    if (row.question_audio_path) {
      try {
        questionAudioUrl = await getReadableObjectUrl(AUDIO_QUIZ_BUCKET, String(row.question_audio_path), 86400);
      } catch {
        /* keep stored url */
      }
    }

    // Load the quiz's questions (multiple audio questions supported).
    const { data: questionRows } = await supabaseAdmin
      .from(AUDIO_QUESTIONS_TABLE)
      .select('*')
      .eq('quiz_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    let questions = await Promise.all(
      (questionRows || []).map(async (r, index) => {
        const q = mapAudioQuestion(r as Record<string, unknown>);
        return {
          id: q.id,
          prompt: q.prompt || `Question ${index + 1}`,
          audioUrl: (await resolveAnswerUrl(q.audioPath)) || q.audioUrl,
          index: index + 1,
        };
      })
    );

    // Backward compatibility: if no question rows but a legacy single question exists, show it.
    if (questions.length === 0 && questionAudioUrl) {
      questions = [{ id: `legacy:${quiz.id}`, prompt: 'Question 1', audioUrl: questionAudioUrl, index: 1 }];
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
      questions,
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
