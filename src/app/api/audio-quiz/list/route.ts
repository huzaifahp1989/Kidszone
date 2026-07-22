import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  AUDIO_QUIZZES_TABLE,
  AUDIO_SUBMISSIONS_TABLE,
  isMissingTableError,
  mapAudioQuiz,
} from '@/lib/audio-quiz-server';
import { hasQuizEnded } from '@/lib/audio-quiz';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { data, error } = await supabaseAdmin
      .from(AUDIO_QUIZZES_TABLE)
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      if (isMissingTableError(error)) return NextResponse.json({ quizzes: [], tableMissing: true });
      throw error;
    }

    const quizzes = (data || []).map((r) => mapAudioQuiz(r as Record<string, unknown>));
    const quizIds = quizzes.map((q) => q.id);

    // Participant counts per quiz + whether the current user already submitted.
    const participantCounts = new Map<string, number>();
    const mySubmitted = new Set<string>();

    if (quizIds.length) {
      const { data: subs } = await supabaseAdmin
        .from(AUDIO_SUBMISSIONS_TABLE)
        .select('quiz_id, user_id')
        .in('quiz_id', quizIds);
      const user = await getAuthenticatedRequestUser(request).catch(() => null);
      for (const s of subs || []) {
        const qid = String((s as Record<string, unknown>).quiz_id);
        participantCounts.set(qid, (participantCounts.get(qid) || 0) + 1);
        if (user && String((s as Record<string, unknown>).user_id) === user.id) mySubmitted.add(qid);
      }
    }

    return NextResponse.json({
      quizzes: quizzes.map((q) => ({
        ...q,
        participantCount: participantCounts.get(q.id) || 0,
        hasSubmitted: mySubmitted.has(q.id),
        ended: hasQuizEnded(q),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ quizzes: [], error: message }, { status: 500 });
  }
}
