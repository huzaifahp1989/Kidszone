import { NextResponse } from 'next/server';
import { tryAwardDailyActivity } from '@/lib/daily-activity-award';
import { isHadithInTodaysSet } from '@/lib/daily-hadith';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { requireMatchingUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const MIN_REFLECTION_LEN = 25;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await requireMatchingUser(req, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const { userId } = auth;
    const hadithId = String(body?.hadithId || '').trim();
    const reflection = String(body?.reflection || '').trim();

    if (!hadithId || !isHadithInTodaysSet(hadithId)) {
      return NextResponse.json(
        { error: 'Please choose one of today\'s 5 Hadiths to reflect on.' },
        { status: 400 }
      );
    }

    if (reflection.length < MIN_REFLECTION_LEN) {
      return NextResponse.json(
        {
          error: `Please write at least ${MIN_REFLECTION_LEN} characters about what you learned.`,
        },
        { status: 400 }
      );
    }

    if (reflection.length > 2000) {
      return NextResponse.json({ error: 'Reflection is too long.' }, { status: 400 });
    }

    const dayKey = new Date().toISOString().slice(0, 10);

    const award = await tryAwardDailyActivity(userId, 'hadith', {
      successMessage: `+${ACTIVITY_BONUS_POINTS} points for learning today's Hadiths and writing your reflection!`,
    });

    // Best-effort save — table may not exist until SETUP_HADITH_REFLECTIONS.sql is run.
    const { error: insertError } = await supabaseAdmin.from('hadith_reflections').upsert(
      {
        user_id: userId,
        hadith_id: hadithId,
        reflection,
        day_key: dayKey,
        points_awarded: award.pointsAwarded,
      },
      { onConflict: 'user_id,day_key' }
    );

    if (insertError && insertError.code !== '42P01') {
      console.warn('[hadith/reflect] save failed:', insertError.message);
    }

    const { data: pointsRow } = await supabaseAdmin
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, today_points')
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({
      success: award.success,
      pointsAwarded: award.pointsAwarded,
      message: award.message,
      reason: award.reason,
      reflectionSaved: !insertError || insertError.code === '42P01',
      profile: {
        points: Number(pointsRow?.total_points ?? 0),
        weeklyPoints: Number(pointsRow?.weekly_points ?? 0),
        monthlyPoints: Number(pointsRow?.monthly_points ?? 0),
        todayPoints: Number(pointsRow?.today_points ?? 0),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[hadith/reflect] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
