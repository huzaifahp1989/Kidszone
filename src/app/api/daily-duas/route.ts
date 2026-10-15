import { NextRequest, NextResponse } from 'next/server';
import { requireMatchingUser } from '@/lib/request-auth';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  DAILY_DHIKR_COUNTERS,
  getDuasForSlot,
  pickDailyDuaFor,
} from '@/data/daily-duas';
import { isoDate } from '@/data/surah-of-the-week';

export const dynamic = 'force-dynamic';

type DuaSlot = 'morning' | 'evening' | 'any';

function todayString(date: Date = new Date()) {
  return isoDate(date);
}

async function awardSafe(userId: string, points: number) {
  if (!Number.isFinite(points) || points <= 0) {
    return { awarded: 0, totalPoints: undefined };
  }
  try {
    const r = await awardPointsWithDailyCapByUserId(userId, points, {
      countTowardDailyLimit: true,
      successMessage: 'Daily dua progress saved.',
    });
    return {
      awarded: r.success ? Number(r.pointsAwarded) || 0 : 0,
      totalPoints: r.totalPoints,
    };
  } catch (e) {
    console.warn('[daily-duas] award failed', e);
    return { awarded: 0, totalPoints: undefined };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const slot = (searchParams.get('slot') as DuaSlot | null) || null;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const today = todayString();
    const defaultSlot: 'morning' | 'evening' =
      slot === 'morning' || slot === 'evening' ? slot : new Date().getHours() < 16 ? 'morning' : 'evening';
    const dailySlots: Array<'morning' | 'evening'> =
      slot === 'any' ? ['morning', 'evening'] : [defaultSlot];

    const featuredBySlot = Object.fromEntries(
      dailySlots.map((s) => [s, { slot: s, dua: pickDailyDuaFor(s) }])
    );

    const [duaRows, dhikrRows] = await Promise.all([
      supabaseAdmin
        .from('daily_dua_completions')
        .select('dua_key, slot, completion_date')
        .eq('user_id', userId)
        .eq('completion_date', today),
      supabaseAdmin
        .from('daily_dhikr_log')
        .select('dhikr_key, total_count')
        .eq('user_id', userId)
        .eq('log_date', today),
    ]);

    if (duaRows.error) console.warn('[daily-duas] GET duas failed', duaRows.error);
    if (dhikrRows.error) console.warn('[daily-duas] GET dhikr failed', dhikrRows.error);

    const completedKeys = new Map<string, Array<'morning' | 'evening' | 'any'>>();
    for (const row of duaRows.data || []) {
      const prev = completedKeys.get(row.dua_key) || [];
      prev.push(row.slot as any);
      completedKeys.set(row.dua_key, prev);
    }

    const dhikrMap = new Map<string, number>();
    for (const row of dhikrRows.data || []) {
      dhikrMap.set(row.dhikr_key, Number(row.total_count) || 0);
    }

    const slots = dailySlots.map((s) => {
      const list = getDuasForSlot(s);
      const featured = pickDailyDuaFor(s);
      return {
        slot: s,
        featuredDuaKey: featured.key,
        duas: list.map((d) => ({
          ...d,
          completed: Boolean(
            (completedKeys.get(d.key) || []).includes(s) ||
              (completedKeys.get(d.key) || []).includes('any' as any)
          ),
        })),
      };
    });

    const dhikr = DAILY_DHIKR_COUNTERS.map((c) => ({
      ...c,
      count: dhikrMap.get(c.key) || 0,
      milestoneReached: (dhikrMap.get(c.key) || 0) >= c.goal,
    }));

    return NextResponse.json({
      success: true,
      date: today,
      featuredBySlot,
      slots,
      dhikr,
    });
  } catch (error: any) {
    console.error('[daily-duas/GET]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load daily duas.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const { userId } = auth;
    const ensured = await ensureUserRecords(userId);
    if (!ensured.ok) {
      return NextResponse.json(
        { success: false, error: ensured.error || 'User profile not ready.' },
        { status: 500 }
      );
    }

    const action = String(body?.action || '').trim();
    const today = todayString();

    if (action === 'complete_dua') {
      const duaKey = String(body?.duaKey || '').trim();
      const slot: DuaSlot = body?.slot === 'evening' ? 'evening' : body?.slot === 'any' ? 'any' : 'morning';
      const points = Number(body?.points) || 0;

      if (!duaKey) {
        return NextResponse.json({ success: false, error: 'duaKey is required.' }, { status: 400 });
      }

      const pool = slot === 'any' ? [...getDuasForSlot('morning'), ...getDuasForSlot('evening')] : getDuasForSlot(slot);
      const dua = pool.find((d) => d.key === duaKey) || pickDailyDuaFor(slot === 'any' ? 'morning' : slot);

      const awardedPoints = Number.isFinite(points) && points > 0 ? points : dua?.points || 2;

      const { error } = await supabaseAdmin
        .from('daily_dua_completions')
        .upsert(
          { user_id: userId, completion_date: today, dua_key: duaKey, slot },
          { onConflict: 'user_id, completion_date, dua_key, slot' }
        );
      if (error) {
        // unique/conflict is fine; rethrow anything else
        if (String(error.code) !== '23505') throw error;
      }

      const award = await awardSafe(userId, awardedPoints);

      return NextResponse.json({
        success: true,
        action,
        date: today,
        points_awarded: award.awarded,
        total_points: award.totalPoints,
      });
    }

    if (action === 'increment_dhikr') {
      const dhikrKey = String(body?.dhikrKey || '').trim();
      const by = Number(body?.by) || 1;
      if (!dhikrKey) {
        return NextResponse.json({ success: false, error: 'dhikrKey is required.' }, { status: 400 });
      }
      const counter = DAILY_DHIKR_COUNTERS.find((c) => c.key === dhikrKey);
      if (!counter) {
        return NextResponse.json({ success: false, error: 'Unknown dhikr key.' }, { status: 400 });
      }
      if (!Number.isFinite(by) || by < 1) {
        return NextResponse.json({ success: false, error: 'Invalid increment.' }, { status: 400 });
      }

      // Raw upsert + update count
      const existing = await supabaseAdmin
        .from('daily_dhikr_log')
        .select('total_count')
        .eq('user_id', userId)
        .eq('log_date', today)
        .eq('dhikr_key', dhikrKey)
        .maybeSingle();

      const prev = Number(existing.data?.total_count || 0);
      const beforeMilestone = prev >= counter.goal;
      const nextCount = Math.min(counter.goal * 10, prev + by);
      const nowMilestone = nextCount >= counter.goal;

      const { error } = await supabaseAdmin.from('daily_dhikr_log').upsert(
        {
          user_id: userId,
          log_date: today,
          dhikr_key: dhikrKey,
          total_count: nextCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, log_date, dhikr_key' }
      );
      if (error) throw error;

      let awarded = 0;
      let totalPoints: number | undefined;
      if (!beforeMilestone && nowMilestone) {
        const res = await awardSafe(userId, counter.pointsPerGoal);
        awarded = res.awarded;
        totalPoints = res.totalPoints;
      }

      return NextResponse.json({
        success: true,
        action,
        dhikrKey,
        count: nextCount,
        milestoneReached: nowMilestone,
        points_awarded: awarded,
        total_points: totalPoints,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[daily-duas/POST]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update daily duas.' },
      { status: 500 }
    );
  }
}
