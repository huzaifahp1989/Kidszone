import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { tryAwardDailyActivity } from '@/lib/daily-activity-award';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { canEarnActivityPoints } from '@/lib/daily-activity-limits';
import { requireMatchingUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

const DUROOD_SUBTYPES = new Set(['short_durood', 'durood_ibrahim', 'jazallah_durood']);
const ZIKR_SUBTYPES = new Set([
  'subhanallah',
  'alhamdulillah',
  'allahu_akbar',
  'kalima_tayyiba',
  'astaghfirullah',
  'subhanallah_wb',
]);

function getWeekStartUtcDateString() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  const weekStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
    0,
    0,
    0,
    0
  ));
  return weekStart.toISOString().slice(0, 10);
}

async function trackCompetitionPledge(userId: string) {
  const weekStart = getWeekStartUtcDateString();
  const { data: existing, error: readErr } = await supabaseAdmin
    .from('weekly_competition_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (readErr) {
    if (readErr.code === '42P01') return;
    throw readErr;
  }

  const next = {
    user_id: userId,
    week_start: weekStart,
    did_quiz: Boolean((existing as any)?.did_quiz),
    did_pledge: true,
    did_game: Boolean((existing as any)?.did_game),
    completed_at: (existing as any)?.completed_at ?? null,
    updated_at: new Date().toISOString(),
  };

  if (next.did_quiz && next.did_pledge && next.did_game && !next.completed_at) {
    next.completed_at = new Date().toISOString();
  }

  const { error: upsertErr } = await supabaseAdmin
    .from('weekly_competition_progress')
    .upsert(next, { onConflict: 'user_id,week_start' });

  if (upsertErr && upsertErr.code !== '42P01') {
    throw upsertErr;
  }
}

async function ensureUserRows(userId: string) {
  await ensureUserRecords(userId);
}

export function calculatePledgePoints(count: number): number {
  if (!Number.isFinite(count) || count < 5) return 0;
  return ACTIVITY_BONUS_POINTS;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const { userId } = auth;
    const type = body?.type === 'zikr' ? 'zikr' : body?.type === 'durood' ? 'durood' : '';
    const subtype = String(body?.subtype || '').trim();
    const count = Number(body?.count);

    if (!type) {
      return NextResponse.json({ error: 'Invalid pledge type.' }, { status: 400 });
    }
    if (!Number.isFinite(count) || count <= 0) {
      return NextResponse.json({ error: 'Please enter a valid number of recitations.' }, { status: 400 });
    }

    const allowedSubtypes = type === 'durood' ? DUROOD_SUBTYPES : ZIKR_SUBTYPES;
    if (!allowedSubtypes.has(subtype)) {
      return NextResponse.json({ error: 'Please select a valid durood or zikr option.' }, { status: 400 });
    }

    await ensureUserRows(userId);

    const pointsRequested = calculatePledgePoints(count);
    const pledgeActivity = type === 'durood' ? 'durood' : 'zikr';
    let pointsAwarded = 0;
    let pointsMessage = '';
    let canAwardPoints = false;

    if (pointsRequested > 0) {
      const gate = await canEarnActivityPoints(userId, pledgeActivity);
      canAwardPoints = gate.allowed;
      if (!gate.allowed) {
        pointsMessage =
          gate.message ||
          `You have already earned today's ${ACTIVITY_BONUS_POINTS} points for ${type}. Your pledge will still be saved.`;
      }
    } else {
      pointsMessage = 'Pledge logged. Recite at least 5 times to earn +25 points.';
    }

    const { error: pledgeError } = await supabaseAdmin.from('pledges').insert({
      user_id: userId,
      type,
      subtype,
      count: Math.floor(count),
    });

    if (pledgeError) {
      if (pledgeError.code === '42P01') {
        return NextResponse.json(
          {
            error: 'Pledge tracking is not set up yet. Please ask admin to run the pledges table migration.',
          },
          { status: 503 }
        );
      }
      console.error('[pledge/submit] insert error:', pledgeError);
      return NextResponse.json({ error: pledgeError.message || 'Could not save your pledge.' }, { status: 500 });
    }

    if (canAwardPoints) {
      const award = await tryAwardDailyActivity(userId, pledgeActivity, {
        successMessage: `+${pointsRequested} points added for your ${type} pledge.`,
        skipActivityLimit: true,
      });
      pointsAwarded = award.pointsAwarded;
      pointsMessage =
        pointsAwarded > 0
          ? award.message
          : award.message || 'Pledge logged, but no points could be added right now.';
    }

    try {
      await trackCompetitionPledge(userId);
    } catch (trackErr) {
      console.warn('[pledge/submit] competition track failed:', trackErr);
    }

    const { data: pointsRow } = await supabaseAdmin
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, today_points')
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      type,
      subtype,
      count: Math.floor(count),
      pointsAwarded,
      message: pointsMessage,
      profile: {
        points: Number(pointsRow?.total_points ?? 0),
        weeklyPoints: Number(pointsRow?.weekly_points ?? 0),
        monthlyPoints: Number(pointsRow?.monthly_points ?? 0),
        todayPoints: Number(pointsRow?.today_points ?? 0),
      },
    });
  } catch (error: any) {
    console.error('[pledge/submit] unexpected error:', error);
    return NextResponse.json({ error: error?.message || 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
