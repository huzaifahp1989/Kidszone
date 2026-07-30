import { NextResponse } from 'next/server';
import { requireMatchingUser } from '@/lib/request-auth';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isCuratedQuranListenSurah } from '@/data/quran-listen-surahs';

export const dynamic = 'force-dynamic';

const MIN_LISTEN_SECONDS = 180;
const QURAN_LISTEN_POINTS = 25;

function getUtcTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await requireMatchingUser(req, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const surahNumber = Number(body?.surahNumber);
    const listenedSeconds = Math.floor(Number(body?.listenedSeconds || 0));

    if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      return NextResponse.json({ error: 'Please pick a valid surah.' }, { status: 400 });
    }

    if (!isCuratedQuranListenSurah(surahNumber)) {
      return NextResponse.json({ error: 'Please choose a surah from the Quran listen list.' }, { status: 400 });
    }

    if (!Number.isFinite(listenedSeconds) || listenedSeconds < MIN_LISTEN_SECONDS) {
      return NextResponse.json(
        {
          error: 'Listen for at least 3 minutes to earn daily points.',
          minSeconds: MIN_LISTEN_SECONDS,
        },
        { status: 400 }
      );
    }

    const today = getUtcTodayKey();
    const markerId = `activity-quran-listen-${today}`;

    const { data: existingMarker, error: markerReadError } = await supabaseAdmin
      .from('game_progress')
      .select('id, points')
      .eq('uid', auth.userId)
      .eq('gameid', markerId)
      .maybeSingle();

    if (markerReadError) throw markerReadError;

    if (existingMarker) {
      return NextResponse.json({
        success: true,
        pointsAwarded: 0,
        reason: 'already_claimed',
        message: 'You already earned Quran listening points today. Come back tomorrow.',
      });
    }

    const award = await awardPointsWithDailyCapByUserId(auth.userId, QURAN_LISTEN_POINTS, {
      countTowardDailyLimit: true,
      successMessage: `MashaAllah! +${QURAN_LISTEN_POINTS} points for listening to Quran today.`,
    });

    const pointsAwarded = Number(award.pointsAwarded || 0);

    await supabaseAdmin.from('game_progress').insert({
      uid: auth.userId,
      gameid: markerId,
      points: pointsAwarded,
      playedat: new Date().toISOString(),
    });

    const reliable = award.hasReliableTotals !== false && award.reason !== 'update_failed';

    return NextResponse.json({
      success: true,
      pointsAwarded,
      reason: pointsAwarded > 0 ? 'awarded' : award.reason,
      message: pointsAwarded > 0 ? award.message : award.message || 'No points awarded.',
      profile: reliable
        ? {
            points: award.totalPoints,
            weeklyPoints: award.weeklyPoints,
            monthlyPoints: award.monthlyPoints,
            todayPoints: award.todayPoints,
          }
        : undefined,
    });
  } catch (error: any) {
    console.error('[quran/listen/complete] error:', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error.' }, { status: 500 });
  }
}
