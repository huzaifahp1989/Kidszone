import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { publicDisplayName } from '@/lib/written-competition';
import {
  listPrizes,
  mapSubmission,
  mapWinner,
  nextPrizeForWinner,
  WRITTEN_SUBMISSIONS_TABLE,
  WRITTEN_WINNERS_TABLE,
} from '@/lib/written-competition-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const { data, error } = await supabaseAdmin
      .from(WRITTEN_WINNERS_TABLE)
      .select('*')
      .eq('competition_id', id)
      .order('selected_at', { ascending: false });
    if (error) throw error;

    const { count: eligibleCount } = await supabaseAdmin
      .from(WRITTEN_SUBMISSIONS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('competition_id', id)
      .in('status', ['eligible', 'winner']);

    const prizes = await listPrizes(id, false);
    const prizeNameById = new Map(prizes.map((prize) => [prize.id, prize.prizeName]));
    const winners = (data || []).map((row) => mapWinner(row as Record<string, unknown>));
    const submissionIds = winners.map((winner) => winner.submissionId);
    const { data: submissionRows } = submissionIds.length
      ? await supabaseAdmin.from(WRITTEN_SUBMISSIONS_TABLE).select('*').in('id', submissionIds)
      : { data: [] as Record<string, unknown>[] };
    const submissionById = new Map(
      (submissionRows || []).map((row) => {
        const mapped = mapSubmission(row as Record<string, unknown>);
        return [mapped.id, mapped];
      })
    );

    return NextResponse.json({
      winners: winners.map((winner) => {
        const submission = submissionById.get(winner.submissionId);
        return {
          ...winner,
          prizeName: winner.prizeId ? prizeNameById.get(winner.prizeId) || null : null,
          userName: submission?.userName || winner.displayName,
          finalScore: submission ? `${submission.totalMarks} / ${submission.maxMarks}` : null,
          submittedAt: submission?.submittedAt || null,
        };
      }),
      eligibleCount: eligibleCount || 0,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const submissionId = String(body.submissionId || '').trim();

    const { data: existingWinners, error: winnersError } = await supabaseAdmin
      .from(WRITTEN_WINNERS_TABLE)
      .select('*')
      .eq('competition_id', id);
    if (winnersError) throw winnersError;
    const mappedWinners = (existingWinners || []).map((row) => mapWinner(row as Record<string, unknown>));

    const blockedIds = new Set(
      mappedWinners.filter((winner) => winner.status !== 'disqualified').map((winner) => winner.submissionId)
    );
    const disqualifiedUserIds = new Set(
      mappedWinners.filter((winner) => winner.status === 'disqualified').map((winner) => winner.userId)
    );

    const { data: eligibleRows, error: eligibleError } = await supabaseAdmin
      .from(WRITTEN_SUBMISSIONS_TABLE)
      .select('*')
      .eq('competition_id', id)
      .eq('status', 'eligible');
    if (eligibleError) throw eligibleError;

    const pool = (eligibleRows || [])
      .map((row) => mapSubmission(row as Record<string, unknown>))
      .filter((row) => !blockedIds.has(row.id) && !disqualifiedUserIds.has(row.userId));

    let chosen = submissionId ? pool.find((row) => row.id === submissionId) || null : null;
    if (!chosen && body.random) {
      if (pool.length === 0) return NextResponse.json({ error: 'No eligible entries remain.' }, { status: 400 });
      chosen = pool[Math.floor(Math.random() * pool.length)];
    }
    if (!chosen) return NextResponse.json({ error: 'Select an eligible submission.' }, { status: 400 });

    const prizes = await listPrizes(id, true);
    const prize = nextPrizeForWinner(prizes, mappedWinners);

    const { data, error } = await supabaseAdmin
      .from(WRITTEN_WINNERS_TABLE)
      .insert({
        competition_id: id,
        prize_id: prize?.id || null,
        submission_id: chosen.id,
        user_id: chosen.userId,
        display_name: publicDisplayName(chosen.userName),
        status: 'awaiting_verification',
        public_display: false,
      })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ winner: mapWinner(data as Record<string, unknown>), submission: chosen });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const reviewer = (await getAuthenticatedRequestUser(request))?.email || 'admin';

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const winnerId = String(body.winnerId || '').trim();
    const action = String(body.action || '');
    if (!winnerId) return NextResponse.json({ error: 'winnerId is required' }, { status: 400 });

    const { data: winnerRow, error: winnerError } = await supabaseAdmin
      .from(WRITTEN_WINNERS_TABLE)
      .select('*')
      .eq('id', winnerId)
      .eq('competition_id', id)
      .maybeSingle();
    if (winnerError) throw winnerError;
    if (!winnerRow) return NextResponse.json({ error: 'Winner not found' }, { status: 404 });

    if (action === 'confirm') {
      const { error } = await supabaseAdmin
        .from(WRITTEN_WINNERS_TABLE)
        .update({
          status: 'confirmed',
          public_display: Boolean(body.publicDisplay),
          display_name: body.displayName ? String(body.displayName) : winnerRow.display_name,
          confirmed_at: new Date().toISOString(),
          confirmed_by: reviewer,
        })
        .eq('id', winnerId);
      if (error) throw error;
      await supabaseAdmin
        .from(WRITTEN_SUBMISSIONS_TABLE)
        .update({ status: 'winner', updated_at: new Date().toISOString() })
        .eq('id', winnerRow.submission_id);
    } else if (action === 'disqualify') {
      const reason = String(body.reason || '').trim();
      if (!reason) return NextResponse.json({ error: 'A disqualification reason is required.' }, { status: 400 });
      const { error } = await supabaseAdmin
        .from(WRITTEN_WINNERS_TABLE)
        .update({
          status: 'disqualified',
          disqualify_reason: reason,
          public_display: false,
          confirmed_by: reviewer,
        })
        .eq('id', winnerId);
      if (error) throw error;
      await supabaseAdmin
        .from(WRITTEN_SUBMISSIONS_TABLE)
        .update({ status: 'eligible', updated_at: new Date().toISOString() })
        .eq('id', winnerRow.submission_id);
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const { data } = await supabaseAdmin.from(WRITTEN_WINNERS_TABLE).select('*').eq('id', winnerId).maybeSingle();
    return NextResponse.json({ winner: data ? mapWinner(data as Record<string, unknown>) : null });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
