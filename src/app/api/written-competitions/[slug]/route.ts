import { NextResponse } from 'next/server';
import {
  DEFAULT_WRITTEN_SLUG,
  isWrittenCompetitionOpen,
  unknownErrorMessage,
} from '@/lib/written-competition';
import {
  getCompetitionBySlug,
  isMissingTableError,
  listActiveQuestions,
  listPrizes,
  mapWinner,
  seedRabiUlAwwalCompetition,
  WRITTEN_WINNERS_TABLE,
} from '@/lib/written-competition-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  rabiUlAwwalFallbackPrizes,
  rabiUlAwwalFallbackQuestions,
  rabiUlAwwalPublicFallbackPayload,
} from '@/lib/written-competition-seed';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const isDefault = slug === DEFAULT_WRITTEN_SLUG;
  try {
    if (isDefault) {
      const seeded = await seedRabiUlAwwalCompetition().catch(() => null);
      if (seeded?.tableMissing) return NextResponse.json(rabiUlAwwalPublicFallbackPayload());
    }

    const result = await getCompetitionBySlug(slug);
    if (result.tableMissing) {
      if (!isDefault) {
        return NextResponse.json({ error: 'Competition is not set up yet.' }, { status: 503 });
      }
      return NextResponse.json(rabiUlAwwalPublicFallbackPayload());
    }

    if (!result.competition || !result.competition.active) {
      if (isDefault) return NextResponse.json(rabiUlAwwalPublicFallbackPayload());
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    let questions;
    let prizes;
    try {
      [questions, prizes] = await Promise.all([
        listActiveQuestions(result.competition.id),
        listPrizes(result.competition.id, true),
      ]);
    } catch (error: unknown) {
      if (isMissingTableError(error as { code?: string; message?: string } | null)) {
        if (isDefault) return NextResponse.json(rabiUlAwwalPublicFallbackPayload());
        return NextResponse.json(
          { error: 'Competition setup is incomplete. Run SETUP_WRITTEN_COMPETITIONS.sql in Supabase, then try again.' },
          { status: 503 }
        );
      }
      throw error;
    }

    if (isDefault && (questions.length === 0 || prizes.length === 0)) {
      await seedRabiUlAwwalCompetition().catch(() => null);
      try {
        [questions, prizes] = await Promise.all([
          listActiveQuestions(result.competition.id),
          listPrizes(result.competition.id, true),
        ]);
      } catch (error: unknown) {
        if (!isMissingTableError(error as { code?: string; message?: string } | null)) throw error;
      }
      if (!questions?.length) questions = rabiUlAwwalFallbackQuestions();
      if (!prizes?.length) prizes = rabiUlAwwalFallbackPrizes();
    }

    let publicWinners: Array<{ id: string; displayName: string; prizeName: string | null }> = [];
    if (result.competition.showWinnersPublicly) {
      const { data: winnerRows } = await supabaseAdmin
        .from(WRITTEN_WINNERS_TABLE)
        .select('*')
        .eq('competition_id', result.competition.id)
        .eq('status', 'confirmed')
        .eq('public_display', true);
      const prizeNameById = new Map(prizes.map((prize) => [prize.id, prize.prizeName]));
      publicWinners = (winnerRows || []).map((row) => {
        const winner = mapWinner(row as Record<string, unknown>);
        return {
          id: winner.id,
          displayName: winner.displayName,
          prizeName: winner.prizeId ? prizeNameById.get(winner.prizeId) || null : null,
        };
      });
    }

    return NextResponse.json({
      competition: result.competition,
      open: isWrittenCompetitionOpen(result.competition),
      questions: questions.map((question) => ({
        id: question.id,
        questionNumber: question.questionNumber,
        questionText: question.questionText,
        difficulty: question.difficulty,
        topic: question.topic,
        maxMarks: question.maxMarks,
        active: question.active,
      })),
      prizes,
      winners: publicWinners,
      setupNeeded: false,
    });
  } catch (error: unknown) {
    console.error('[written-competitions]', slug, unknownErrorMessage(error));
    if (isDefault) return NextResponse.json(rabiUlAwwalPublicFallbackPayload());
    return NextResponse.json({ error: unknownErrorMessage(error) }, { status: 500 });
  }
}
