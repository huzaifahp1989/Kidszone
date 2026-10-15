import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { POINTS_DAILY_CAP } from '@/lib/points-policy';
import {
  daysInUtcMonth,
  estimateDailyPointsForMonth,
  loadMonthlyPointsRows,
  monthKeyFromDate,
  monthLabel,
  parseMonthKey,
  type DayPointsCell,
} from '@/lib/points-calendar';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const requestedMonth = String(searchParams.get('month') || monthKeyFromDate(now)).trim();
    const parsed = parseMonthKey(requestedMonth);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid month. Use YYYY-MM.' }, { status: 400 });
    }

    const year = Number(searchParams.get('year') || parsed.year);
    if (!Number.isFinite(year) || year < 2020 || year > now.getUTCFullYear() + 1) {
      return NextResponse.json({ error: 'Invalid year.' }, { status: 400 });
    }

    const todayKey = now.toISOString().slice(0, 10);
    const [{ months, yearTotal, live }, estimatedDays] = await Promise.all([
      loadMonthlyPointsRows(user.id, year),
      estimateDailyPointsForMonth(user.id, parsed.year, parsed.month),
    ]);

    const dayKeys = daysInUtcMonth(parsed.year, parsed.month);
    const days: DayPointsCell[] = dayKeys.map((date) => {
      const isToday = date === todayKey;
      if (isToday) {
        return { date, points: live.today, estimated: false, isToday: true };
      }
      return {
        date,
        points: estimatedDays.get(date) || 0,
        estimated: true,
        isToday: false,
      };
    });

    const monthPointsFromDays = days.reduce((sum, d) => sum + d.points, 0);
    const currentMonthKey = monthKeyFromDate(now);
    const selectedMonthLive = months.find((m) => m.key === `${parsed.year}-${String(parsed.month).padStart(2, '0')}`);
    const selectedMonthPoints =
      selectedMonthLive?.key === currentMonthKey
        ? live.month
        : selectedMonthLive?.points || monthPointsFromDays;

    return NextResponse.json({
      ok: true,
      dailyCap: POINTS_DAILY_CAP,
      timezone: 'UTC',
      note:
        'Past days are estimated from quizzes, games, salah, hadith, and pledges (capped at 200/day). Today and this month use your live totals.',
      summary: {
        today: live.today,
        thisMonth: live.month,
        thisYear: year === now.getUTCFullYear() ? yearTotal : yearTotal,
        allTime: live.total,
        selectedMonth: selectedMonthPoints,
        selectedYear: yearTotal,
      },
      month: {
        key: `${parsed.year}-${String(parsed.month).padStart(2, '0')}`,
        label: monthLabel(`${parsed.year}-${String(parsed.month).padStart(2, '0')}`),
        days,
      },
      year: {
        key: year,
        months,
        total: yearTotal,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[me/points-calendar]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
