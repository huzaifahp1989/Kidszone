import { NextRequest, NextResponse } from 'next/server';
import { requireMatchingUser } from '@/lib/request-auth';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSurahOfTheWeek, isoDate } from '@/data/surah-of-the-week';
import { HIFZ_SURAH_LIST } from '@/data/hifz-surahs';
import { JUZ_AMMA_SURAH_LIST } from '@/data/juz-amma';

export const dynamic = 'force-dynamic';

type ProgressFlags = {
  listened?: boolean;
  read_full?: boolean;
  practiced?: boolean;
  read_minutes?: number;
};

function resolveSurahMeta(surahNumber: number) {
  const meta =
    HIFZ_SURAH_LIST.find((s) => s.number === surahNumber) ||
    JUZ_AMMA_SURAH_LIST.find((s) => s.number === surahNumber) ||
    null;
  if (!meta) {
    return {
      number: surahNumber,
      arabicName: `سورة ${surahNumber}`,
      englishName: `Surah ${surahNumber}`,
      ayahCount: null as number | null,
      difficulty: 'beginner' as const,
      theme: '',
      mainLesson: '',
    };
  }
  const ammaExtra = JUZ_AMMA_SURAH_LIST.find((s) => s.number === surahNumber);
  return {
    number: surahNumber,
    arabicName: meta.arabicName,
    englishName: meta.englishName,
    ayahCount: (meta as any).ayahCount ?? ammaExtra?.ayahCount ?? null,
    difficulty: (meta as any).difficulty ?? 'beginner',
    theme: ammaExtra?.theme ?? '',
    mainLesson: ammaExtra?.mainLesson ?? '',
  };
}

async function awardSafe(userId: string, points: number) {
  if (!Number.isFinite(points) || points <= 0) return { awarded: 0, totalPoints: undefined };
  try {
    const r = await awardPointsWithDailyCapByUserId(userId, points, {
      countTowardDailyLimit: true,
      successMessage: 'Surah progress saved.',
    });
    return { awarded: r.success ? Number(r.pointsAwarded) || 0 : 0, totalPoints: r.totalPoints };
  } catch (e) {
    console.warn('[surah-of-the-week] award failed', e);
    return { awarded: 0, totalPoints: undefined };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const entry = getSurahOfTheWeek();
    const meta = resolveSurahMeta(entry.surahNumber);

    const { data: row, error } = await supabaseAdmin
      .from('surah_of_the_week_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', entry.weekStart)
      .maybeSingle();

    if (error && String(error.code) !== 'PGRST116') throw error;

    const readMinutes = Number(row?.read_minutes) || 0;
    const listened = Boolean(row?.listened);
    const readFull = Boolean(row?.read_full);
    const practiced = Boolean(row?.practiced_at_least_once);

    const listenedPoints = listened ? 5 : 0;
    const readFullPoints = readFull ? 15 : 0;
    const practicedPoints = practiced ? 5 : 0;
    const readMinutePoints = Math.max(0, Math.floor(readMinutes / 3) * 2);
    const totalEarnedSoFar = listenedPoints + readFullPoints + practicedPoints + readMinutePoints;

    const percent = Math.min(
      100,
      Math.round(((Number(listened) + Number(readFull) + Number(practiced) + Math.min(3, Math.floor(readMinutes / 5))) / 6) * 100)
    );

    return NextResponse.json({
      success: true,
      week: {
        weekStart: entry.weekStart,
        weekEnd: entry.weekEnd,
        focus: entry.focus,
        badge: entry.badge,
        hint: entry.hint,
        surah: {
          ...meta,
          listenUrl: `/quran/listen/${entry.surahNumber}`,
          learnUrl: `/quran/surah/${entry.surahNumber}`,
          apiUrl: `/api/quran/surah/${entry.surahNumber}`,
        },
      },
      progress: {
        completed: percent === 100,
        percent,
        readMinutes,
        listened,
        readFull,
        practiced,
        pointsEarned: totalEarnedSoFar,
      },
    });
  } catch (e: any) {
    console.error('[surah-of-the-week/GET]', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to load Surah of the Week.' },
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

    const entry = getSurahOfTheWeek();
    const weekStart = entry.weekStart;
    const surahNumber = entry.surahNumber;

    const existing = await supabaseAdmin
      .from('surah_of_the_week_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStart)
      .maybeSingle();

    const prev = existing.data || null;
    const prevListened = Boolean(prev?.listened);
    const prevReadFull = Boolean(prev?.read_full);
    const prevPracticed = Boolean(prev?.practiced_at_least_once);
    const prevMinutes = Number(prev?.read_minutes) || 0;

    const nextFlags: ProgressFlags = body?.flags && typeof body.flags === 'object' ? body.flags : {};
    if (nextFlags.read_minutes !== undefined) {
      const v = Number(nextFlags.read_minutes);
      nextFlags.read_minutes = Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
    }

    const nextListened = nextFlags.listened === undefined ? prevListened : Boolean(nextFlags.listened);
    const nextReadFull = nextFlags.read_full === undefined ? prevReadFull : Boolean(nextFlags.read_full);
    const nextPracticed = nextFlags.practiced === undefined ? prevPracticed : Boolean(nextFlags.practiced);
    const nextMinutesDelta = Number(nextFlags.read_minutes);
    const nextMinutes = Number.isFinite(nextMinutesDelta) && nextMinutesDelta > 0
      ? prevMinutes + nextMinutesDelta
      : prevMinutes;

    // Points: one-time per boolean milestone; minutes pay every 3m capped at 12 points/day-equivalent (18 min here).
    let pointsToAward = 0;
    if (!prevListened && nextListened) pointsToAward += 5;
    if (!prevReadFull && nextReadFull) pointsToAward += 15;
    if (!prevPracticed && nextPracticed) pointsToAward += 5;
    if (Number.isFinite(nextMinutesDelta) && nextMinutesDelta > 0) {
      const milestones = Math.floor(nextMinutes / 3) - Math.floor(prevMinutes / 3);
      pointsToAward += Math.max(0, Math.min(12, milestones * 2));
    }

    const { error: upsertError } = await supabaseAdmin
      .from('surah_of_the_week_progress')
      .upsert(
        {
          user_id: userId,
          week_start_date: weekStart,
          surah_number: surahNumber,
          listened: nextListened,
          read_full: nextReadFull,
          practiced_at_least_once: nextPracticed,
          read_minutes: nextMinutes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, week_start_date' }
      );
    if (upsertError) throw upsertError;

    const award = await awardSafe(userId, pointsToAward);

    const percent = Math.min(
      100,
      Math.round(((Number(nextListened) + Number(nextReadFull) + Number(nextPracticed) + Math.min(3, Math.floor(nextMinutes / 5))) / 6) * 100)
    );

    return NextResponse.json({
      success: true,
      weekStart,
      weekEnd: entry.weekEnd,
      points_awarded: award.awarded,
      total_points: award.totalPoints,
      progress: {
        completed: percent === 100,
        percent,
        readMinutes: nextMinutes,
        listened: nextListened,
        readFull: nextReadFull,
        practiced: nextPracticed,
      },
      todayDate: isoDate(),
    });
  } catch (e: any) {
    console.error('[surah-of-the-week/POST]', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to update Surah of the Week.' },
      { status: 500 }
    );
  }
}
