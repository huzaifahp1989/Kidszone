import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { countGameEarningSessions, isGameEarningSessionRow } from '@/lib/daily-activity-limits';
import { getCurrentWeekRangeUtc } from '@/lib/weekly-activity';

export const dynamic = 'force-dynamic';

function utcDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get('userId') || '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const days = lastNDays(28);
    const startIso = `${days[0]}T00:00:00.000Z`;

    const [quizRes, gameRes, salahRes, userRes, quizCountRes, gameCountRes, salahDaysRes, habitRes, sadaqahRes, quranCountRes, hadithCountRes, arabicCountRes, milestoneRes] =
      await Promise.all([
        supabaseAdmin
          .from('quiz_attempts')
          .select('completed_at')
          .eq('user_id', userId)
          .gte('completed_at', startIso),
        supabaseAdmin
          .from('game_progress')
          .select('playedat, gameid, points')
          .eq('uid', userId)
          .gte('playedat', startIso),
        supabaseAdmin
          .from('salah_entries')
          .select('date')
          .eq('user_id', userId)
          .gte('date', days[0]),
        supabaseAdmin.from('users').select('streak, points').eq('uid', userId).maybeSingle(),
        supabaseAdmin
          .from('quiz_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabaseAdmin.from('game_progress').select('gameid, points').eq('uid', userId),
        supabaseAdmin.from('salah_entries').select('date').eq('user_id', userId),
        supabaseAdmin
          .from('kids_zone_feature_progress')
          .select('date, good_deeds')
          .eq('user_id', userId),
        supabaseAdmin
          .from('kids_donations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabaseAdmin
          .from('quiz_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .ilike('topic', '%quran%'),
        supabaseAdmin
          .from('quiz_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .ilike('topic', '%hadith%'),
        supabaseAdmin
          .from('game_progress')
          .select('id', { count: 'exact', head: true })
          .eq('uid', userId)
          .ilike('gameid', '%arabic%'),
        (async () => {
          const { weekStartIso } = getCurrentWeekRangeUtc();
          const d = new Date(weekStartIso);
          const year = d.getUTCFullYear();
          const onejan = new Date(Date.UTC(year, 0, 1));
          const weekNum = Math.ceil(
            ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7
          );
          const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;
          return supabaseAdmin
            .from('weekly_milestone_claims')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('week_key', weekKey);
        })(),
      ]);

    const activeDates = new Set<string>();

    for (const row of quizRes.data || []) {
      const key = utcDateKey(String(row.completed_at || ''));
      if (key) activeDates.add(key);
    }

    for (const row of gameRes.data || []) {
      if (!isGameEarningSessionRow(row)) continue;
      const key = utcDateKey(String(row.playedat || ''));
      if (key) activeDates.add(key);
    }

    for (const row of salahRes.data || []) {
      const key = String(row.date || '').slice(0, 10);
      if (key) activeDates.add(key);
    }

    const salahDaySet = new Set<string>();
    for (const row of salahDaysRes.data || []) {
      const key = String(row.date || '').slice(0, 10);
      if (key) salahDaySet.add(key);
    }

    const gameRows = (gameCountRes.data || []).filter(isGameEarningSessionRow);
    const quizTotal = Number(quizCountRes.count ?? 0);
    const gameTotal = countGameEarningSessions(gameRows);

    const habitDaySet = new Set<string>();
    for (const row of habitRes.data || []) {
      const deeds = Array.isArray(row.good_deeds) ? row.good_deeds : [];
      if (!deeds.length) continue;
      const key = String(row.date || '').slice(0, 10);
      if (key) habitDaySet.add(key);
    }

    const { data: pointsRow } = await supabaseAdmin
      .from('users_points')
      .select('total_points')
      .eq('user_id', userId)
      .maybeSingle();

    const totalPoints =
      Number(pointsRow?.total_points ?? userRes.data?.points ?? 0) || 0;

    const quranCount = Number(quranCountRes.count ?? 0);
    const hadithCount = Number(hadithCountRes.count ?? 0);
    const arabicCount = Number(arabicCountRes.count ?? 0);
    const weeklyMilestoneClaimed = Number(milestoneRes.count ?? 0) > 0;

    return NextResponse.json({
      activeDates: days.filter((d) => activeDates.has(d)),
      days,
      stats: {
        quizCount: quizTotal,
        gameCount: gameTotal,
        salahDays: salahDaySet.size,
        streak: Number(userRes.data?.streak ?? 0),
        totalPoints,
        habitDays: habitDaySet.size,
        activeDays: activeDates.size,
        sadaqahCount: Number(sadaqahRes.count ?? 0),
        quranCount,
        hadithCount,
        arabicCount,
        totalActivities: quizTotal + gameTotal + quranCount + hadithCount + arabicCount,
        weeklyMilestoneClaimed,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[user/activity-calendar]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
