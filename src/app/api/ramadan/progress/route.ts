import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireMatchingUser } from '@/lib/request-auth';
import {
  getActiveRamadanPeriod,
  getRamadanDayInfo,
  RAMADAN_BADGES,
  type RamadanBadgeId,
  toDateKey,
} from '@/lib/ramadan-mode';

export const dynamic = 'force-dynamic';

async function countInRange(
  table: string,
  userId: string,
  dateColumn: string,
  startIso: string,
  endIso: string,
  uidColumn = 'user_id'
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(uidColumn, userId)
    .gte(dateColumn, startIso)
    .lte(dateColumn, endIso);

  if (error) throw error;
  return Number(count ?? 0);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireMatchingUser(request, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;

    const period = getActiveRamadanPeriod();
    if (!period) {
      return NextResponse.json({ active: false });
    }

    const todayKey = toDateKey();
    const dayInfo = getRamadanDayInfo(period, todayKey);
    const startIso = `${period.start}T00:00:00.000Z`;
    const endIso = `${period.end}T23:59:59.999Z`;
    const todayStart = `${todayKey}T00:00:00.000Z`;
    const todayEnd = `${todayKey}T23:59:59.999Z`;

    const [quizToday, pledgeToday, quizPeriod, pledgePeriod, fastRows] = await Promise.all([
      countInRange('quiz_attempts', auth.userId, 'completed_at', todayStart, todayEnd),
      countInRange('pledges', auth.userId, 'created_at', todayStart, todayEnd),
      countInRange('quiz_attempts', auth.userId, 'completed_at', startIso, endIso),
      countInRange('pledges', auth.userId, 'created_at', startIso, endIso),
      supabaseAdmin
        .from('ramadan_fast_logs')
        .select('fast_date')
        .eq('user_id', auth.userId)
        .gte('fast_date', period.start)
        .lte('fast_date', period.end),
    ]);

    let fastDates = new Set<string>();
    if (!fastRows.error && fastRows.data) {
      fastDates = new Set(fastRows.data.map((r) => String((r as { fast_date: string }).fast_date).slice(0, 10)));
    }

    const fastToday = fastDates.has(todayKey);

    const todayMissions = {
      quiz: quizToday > 0,
      pledge: pledgeToday > 0,
      fast: fastToday,
    };

    const activeDays = new Set<string>();
    // Approximate active days from quiz + pledge dates in period
    const [quizDaysRes, pledgeDaysRes] = await Promise.all([
      supabaseAdmin
        .from('quiz_attempts')
        .select('completed_at')
        .eq('user_id', auth.userId)
        .gte('completed_at', startIso)
        .lte('completed_at', endIso),
      supabaseAdmin
        .from('pledges')
        .select('created_at')
        .eq('user_id', auth.userId)
        .gte('created_at', startIso)
        .lte('created_at', endIso),
    ]);

    const dayScores = new Map<string, number>();

    for (const row of quizDaysRes.data || []) {
      const d = String((row as { completed_at: string }).completed_at).slice(0, 10);
      if (d >= period.start && d <= period.end) {
        activeDays.add(d);
        dayScores.set(d, (dayScores.get(d) || 0) + 1);
      }
    }
    for (const row of pledgeDaysRes.data || []) {
      const d = String((row as { created_at: string }).created_at).slice(0, 10);
      if (d >= period.start && d <= period.end) {
        activeDays.add(d);
        dayScores.set(d, (dayScores.get(d) || 0) + 1);
      }
    }
    for (const d of fastDates) {
      activeDays.add(d);
      dayScores.set(d, (dayScores.get(d) || 0) + 1);
    }

    const strongDays = [...dayScores.entries()].filter(([, score]) => score >= 2).length;
    const laylatActive =
      dayInfo.laylatulQadrHighlight &&
      (quizToday > 0 || pledgeToday > 0 || fastToday);

    const badges: Array<{ id: RamadanBadgeId; earned: boolean; name: string; description: string; icon: string }> = [
      {
        id: 'ramadan-starter',
        earned: strongDays >= 3,
        ...RAMADAN_BADGES['ramadan-starter'],
      },
      {
        id: 'ramadan-star',
        earned: strongDays >= 7,
        ...RAMADAN_BADGES['ramadan-star'],
      },
      {
        id: 'laylat-champion',
        earned: laylatActive,
        ...RAMADAN_BADGES['laylat-champion'],
      },
    ];

    return NextResponse.json({
      active: true,
      period: {
        id: period.id,
        start: period.start,
        end: period.end,
        isDemo: period.isDemo ?? false,
      },
      dayInfo,
      todayMissions,
      stats: {
        fastDaysLogged: fastDates.size,
        quizSessions: quizPeriod,
        pledgeLogs: pledgePeriod,
        activeDays: activeDays.size,
        strongDays,
      },
      badges,
      links: {
        wordSearch: '/games/word-search/ramadan',
        quiz: '/quiz',
        pledge: '/pledge',
        guide: '/guide',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
