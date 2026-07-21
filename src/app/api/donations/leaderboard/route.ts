import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getScoreWeekRangeUtc } from '@/lib/weekly-score-core';
import type { DonationLeaderboardEntry } from '@/types/donation';

export const dynamic = 'force-dynamic';

type Period = 'week' | 'month' | 'all';
type Sort = 'amount' | 'count';

function getPeriodStartIso(period: Period): string | null {
  const now = new Date();
  if (period === 'all') return null;

  if (period === 'week') {
    return getScoreWeekRangeUtc(now).weekStartIso;
  }

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  return monthStart.toISOString();
}

function sanitizeName(name: string | null | undefined, uid?: string | null) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'Friend';
  if (uid && trimmed === uid) return 'Friend';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return 'Friend';
  }
  return trimmed;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'week') as Period;
    const sort = (searchParams.get('sort') || 'count') as Sort;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));

    const periodStartIso = getPeriodStartIso(
      period === 'month' || period === 'all' ? period : 'week'
    );

    let query = supabaseAdmin
      .from('kids_donations')
      .select('user_id, amount_pence, created_at');

    if (periodStartIso) {
      query = query.gte('created_at', periodStartIso);
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, leaders: [], setupRequired: true });
      }
      throw error;
    }

    const totals = new Map<string, { count: number; amountPence: number }>();
    for (const row of data || []) {
      const uid = String((row as { user_id: string }).user_id || '');
      if (!uid) continue;
      const current = totals.get(uid) || { count: 0, amountPence: 0 };
      current.count += 1;
      current.amountPence += Number((row as { amount_pence: number }).amount_pence ?? 0);
      totals.set(uid, current);
    }

    const userIds = [...totals.keys()];
    if (!userIds.length) {
      return NextResponse.json({ success: true, leaders: [], period, sort });
    }

    const [{ data: users }, { data: winnerRows }] = await Promise.all([
      supabaseAdmin.from('users').select('*').in('uid', userIds),
      supabaseAdmin.from('featured_winners').select('user_id').in('user_id', userIds),
    ]);

    const winnerTickByUser = new Set<string>(
      (winnerRows || []).map((row) => String((row as { user_id: string }).user_id))
    );

    const leaders: DonationLeaderboardEntry[] = userIds.map((userId) => {
      const stats = totals.get(userId)!;
      const profile = (users || []).find((row) => String((row as { uid: string }).uid) === userId) as
        | Record<string, unknown>
        | undefined;

      const madrasahName = String(
        profile?.madrasahName ||
          profile?.madrasahname ||
          profile?.madrasah_name ||
          profile?.masjid_name ||
          ''
      );

      return {
        userId,
        name: sanitizeName(profile?.name as string | undefined, userId),
        madrasahName,
        donationCount: stats.count,
        totalAmountPence: stats.amountPence,
        winnerTick: winnerTickByUser.has(userId),
      };
    });

    leaders.sort((a, b) => {
      if (sort === 'amount') {
        if (b.totalAmountPence !== a.totalAmountPence) {
          return b.totalAmountPence - a.totalAmountPence;
        }
        return b.donationCount - a.donationCount;
      }
      if (b.donationCount !== a.donationCount) {
        return b.donationCount - a.donationCount;
      }
      return b.totalAmountPence - a.totalAmountPence;
    });

    return NextResponse.json({
      success: true,
      period,
      sort,
      leaders: leaders.slice(0, limit),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load donation leaderboard';
    return NextResponse.json({ success: false, leaders: [], error: message }, { status: 500 });
  }
}
