import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  createPrizeWinRecord,
  resolveUserIdByDisplayName,
} from '@/lib/monthly-points-snapshot';
import {
  getMonthKeysForQuarter,
  getQuarterKey,
  getQuarterlyDrawWeight,
  isEligibleForQuarterlyDraw,
  QUARTERLY_DRAW_MIN_STARS,
} from '@/lib/leaderboard-rules';

export const dynamic = 'force-dynamic';

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || /prize_win_records|user_monthly_progress/i.test(String(error.message || ''));
}

type EligibleKid = {
  userId: string;
  name: string;
  email: string | null;
  stars: number;
  months: string[];
  weight: number;
  pointsSum: number;
};

async function listQuarterlyEligible(quarterKey: string): Promise<{
  eligible: EligibleKid[];
  setupRequired?: boolean;
}> {
  const monthKeys = getMonthKeysForQuarter(quarterKey);
  if (!monthKeys.length) return { eligible: [] };

  const monthStarts = monthKeys.map((k) => `${k}-01`);
  const { data: starRows, error } = await supabaseAdmin
    .from('user_monthly_progress')
    .select('user_id, month_start, star_earned, leaderboard_monthly_points, total_points')
    .in('month_start', monthStarts)
    .eq('star_earned', true);

  if (error) {
    if (isMissingTableError(error)) return { eligible: [], setupRequired: true };
    throw error;
  }

  const byUser = new Map<string, { userId: string; stars: number; months: string[]; pointsSum: number }>();
  for (const row of starRows || []) {
    const uid = String((row as any).user_id);
    const existing = byUser.get(uid) || { userId: uid, stars: 0, months: [], pointsSum: 0 };
    existing.stars += 1;
    existing.months.push(String((row as any).month_start).slice(0, 7));
    existing.pointsSum += Number(
      (row as any).leaderboard_monthly_points || (row as any).total_points || 0
    );
    byUser.set(uid, existing);
  }

  const eligibleRaw = Array.from(byUser.values()).filter((u) => isEligibleForQuarterlyDraw(u.stars));
  const userIds = eligibleRaw.map((u) => u.userId);
  const { data: users } = userIds.length
    ? await supabaseAdmin.from('users').select('uid, name, email').in('uid', userIds)
    : { data: [] as any[] };

  const nameById = new Map((users || []).map((u: any) => [String(u.uid), u]));

  const eligible = eligibleRaw
    .map((u) => {
      const profile = nameById.get(u.userId);
      return {
        userId: u.userId,
        name: profile?.name || 'Unknown',
        email: profile?.email || null,
        stars: u.stars,
        months: u.months,
        weight: getQuarterlyDrawWeight(u.stars),
        pointsSum: u.pointsSum,
      };
    })
    .sort((a, b) => b.stars - a.stars || b.pointsSum - a.pointsSum);

  return { eligible };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const periodType = String(searchParams.get('periodType') || '').trim();
    const userId = String(searchParams.get('userId') || '').trim();
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || '100')));

    let query = supabaseAdmin
      .from('prize_win_records')
      .select(
        'id, user_id, period_type, period_key, display_name, points_at_win, weekly_points_at_win, monthly_points_at_win, stars_at_win, notes, created_at, created_by'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (periodType && ['weekly', 'monthly', 'quarterly'].includes(periodType)) {
      query = query.eq('period_type', periodType);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({
          wins: [],
          setupRequired: true,
          setupSqlPath: 'supabase/migrations/20260725_points_reliability_stars.sql',
        });
      }
      throw error;
    }

    return NextResponse.json({ wins: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action || 'create').trim();

    if (action === 'quarterly-eligible') {
      const quarterKey = String(body?.quarterKey || getQuarterKey()).trim();
      const result = await listQuarterlyEligible(quarterKey);
      return NextResponse.json({
        quarterKey,
        minStars: QUARTERLY_DRAW_MIN_STARS,
        ...result,
      });
    }

    if (action === 'pick-quarterly') {
      const quarterKey = String(body?.quarterKey || getQuarterKey()).trim();
      const forcedUserId = String(body?.userId || '').trim() || null;
      const { eligible, setupRequired } = await listQuarterlyEligible(quarterKey);

      if (setupRequired) {
        return NextResponse.json({ error: 'Setup required', setupRequired: true }, { status: 503 });
      }
      if (!eligible.length) {
        return NextResponse.json({ error: 'No eligible kids for this quarter' }, { status: 400 });
      }

      let winner = eligible.find((e) => e.userId === forcedUserId) || null;
      if (!winner) {
        const weighted: EligibleKid[] = [];
        for (const e of eligible) {
          for (let i = 0; i < Math.max(1, e.weight); i += 1) weighted.push(e);
        }
        winner = weighted[Math.floor(Math.random() * weighted.length)];
      }

      const record = await createPrizeWinRecord({
        userId: winner.userId,
        periodType: 'quarterly',
        periodKey: quarterKey,
        displayName: winner.name,
        starsAtWin: winner.stars,
        notes: `Weighted quarterly draw (${winner.stars} stars)`,
        createdBy: 'admin',
      });

      return NextResponse.json({
        ok: true,
        winner,
        prizeWin: record,
        eligibleCount: eligible.length,
      });
    }

    const periodType = String(body?.periodType || 'weekly').trim() as 'weekly' | 'monthly' | 'quarterly';
    const periodKey = String(body?.periodKey || '').trim();
    const displayName = String(body?.displayName || body?.winnerName || '').trim();
    let userId = String(body?.userId || '').trim() || null;
    const notes = body?.notes ? String(body.notes) : null;

    if (!displayName || !periodKey) {
      return NextResponse.json({ error: 'displayName and periodKey are required' }, { status: 400 });
    }
    if (!['weekly', 'monthly', 'quarterly'].includes(periodType)) {
      return NextResponse.json({ error: 'Invalid periodType' }, { status: 400 });
    }

    if (!userId) {
      userId = await resolveUserIdByDisplayName(displayName);
    }

    const record = await createPrizeWinRecord({
      userId,
      periodType,
      periodKey,
      displayName,
      notes,
      createdBy: 'admin',
    });

    if (!record.ok) {
      return NextResponse.json({ error: record.error }, { status: 503 });
    }

    return NextResponse.json({ ok: true, id: record.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
