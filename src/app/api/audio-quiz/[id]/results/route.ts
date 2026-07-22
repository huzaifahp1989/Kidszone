import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  AUDIO_QUIZZES_TABLE,
  AUDIO_SUBMISSIONS_TABLE,
  AUDIO_WINNERS_TABLE,
  isMissingTableError,
  mapAudioQuiz,
} from '@/lib/audio-quiz-server';
import { hasQuizEnded } from '@/lib/audio-quiz';

export const dynamic = 'force-dynamic';

const sanitizeName = (name: string | null | undefined) => {
  const t = (name ?? '').trim();
  if (!t) return 'Friend';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
  return isUuid ? 'Friend' : t;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { data: quizRow, error: quizError } = await supabaseAdmin
      .from(AUDIO_QUIZZES_TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (quizError) {
      if (isMissingTableError(quizError)) return NextResponse.json({ error: 'Not set up' }, { status: 404 });
      throw quizError;
    }
    if (!quizRow) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    const quiz = mapAudioQuiz(quizRow as Record<string, unknown>);

    const [{ count }, winnersRes] = await Promise.all([
      supabaseAdmin.from(AUDIO_SUBMISSIONS_TABLE).select('id', { count: 'exact', head: true }).eq('quiz_id', id),
      supabaseAdmin.from(AUDIO_WINNERS_TABLE).select('user_name, place').eq('quiz_id', id).order('place', { ascending: true }),
    ]);

    const ended = hasQuizEnded(quiz);
    const winners = (winnersRes.data || []).map((w) => ({
      name: sanitizeName((w as Record<string, unknown>).user_name as string | null),
      place: Number((w as Record<string, unknown>).place ?? 0),
    }));

    // Scores are never exposed; winners are only shown once announced.
    return NextResponse.json({
      quiz: { id: quiz.id, title: quiz.title, prizeDetails: quiz.prizeDetails, endDate: quiz.endDate, bannerUrl: quiz.bannerUrl },
      participantCount: Number(count || 0),
      ended,
      winnersAnnounced: winners.length > 0,
      winners,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
