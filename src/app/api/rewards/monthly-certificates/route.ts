import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type MonthlySummary = {
  key: string;
  month: number;
  year: number;
  label: string;
  quizAttempts: number;
  pledgeLogs: number;
  pledgeRecitations: number;
  gameSessions: number;
  pointsFromQuiz: number;
  pointsFromGames: number;
  totalActivities: number;
  qualified: boolean;
};

function toMonthKey(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function buildRecentMonthKeys(months: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < months; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(toMonthKey(d));
  }
  return keys;
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const months = Math.max(1, Math.min(24, Number(searchParams.get('months') || '12')));

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const monthKeys = buildRecentMonthKeys(months);
    const oldestKey = monthKeys[monthKeys.length - 1];
    const oldestStart = new Date(`${oldestKey}-01T00:00:00.000Z`).toISOString();

    const [userRes, quizRes, pledgeRes] = await Promise.all([
      supabaseAdmin.from('users').select('uid, name, email').eq('uid', userId).maybeSingle(),
      supabaseAdmin
        .from('quiz_attempts')
        .select('score, completed_at')
        .eq('user_id', userId)
        .gte('completed_at', oldestStart),
      supabaseAdmin
        .from('pledges')
        .select('count, created_at')
        .eq('user_id', userId)
        .gte('created_at', oldestStart),
    ]);

    // Prefer persisted monthly snapshots when available (includes historical backfill).
    let snapshotRows: Array<{
      month_start: string;
      quiz_attempts: number;
      pledge_logs: number;
      pledge_recitations: number;
      game_sessions: number;
      points_from_quiz: number;
      points_from_games: number;
      total_activities: number;
      certificate_qualified: boolean;
    }> = [];
    try {
      const snapshotRes = await supabaseAdmin
        .from('user_monthly_progress')
        .select('month_start, quiz_attempts, pledge_logs, pledge_recitations, game_sessions, points_from_quiz, points_from_games, total_activities, certificate_qualified')
        .eq('user_id', userId)
        .gte('month_start', `${oldestKey}-01`)
        .order('month_start', { ascending: false });
      if (!snapshotRes.error && snapshotRes.data) {
        snapshotRows = snapshotRes.data as typeof snapshotRows;
      }
    } catch {
      snapshotRows = [];
    }

    let gamesRows: Array<{ points_earned: number | null; played_at: string | null }> = [];
    try {
      const gamesRes = await supabaseAdmin
        .from('game_activity_logs')
        .select('points_earned, played_at')
        .eq('user_id', userId)
        .gte('played_at', oldestStart);
      if (!gamesRes.error && gamesRes.data) {
        gamesRows = gamesRes.data as Array<{ points_earned: number | null; played_at: string | null }>;
      }
    } catch {
      gamesRows = [];
    }

    if (quizRes.error) {
      return NextResponse.json({ error: quizRes.error.message }, { status: 500 });
    }
    if (pledgeRes.error) {
      return NextResponse.json({ error: pledgeRes.error.message }, { status: 500 });
    }

    const byMonth = new Map<string, MonthlySummary>();
    const snapshotMonthKeys = new Set<string>();
    const currentMonthKey = toMonthKey(new Date());

    for (const key of monthKeys) {
      const [year, month] = key.split('-').map(Number);
      byMonth.set(key, {
        key,
        month,
        year,
        label: monthLabel(key),
        quizAttempts: 0,
        pledgeLogs: 0,
        pledgeRecitations: 0,
        gameSessions: 0,
        pointsFromQuiz: 0,
        pointsFromGames: 0,
        totalActivities: 0,
        qualified: false,
      });
    }

    // If snapshot exists, use it directly for month calculations.
    if (snapshotRows.length > 0) {
      for (const row of snapshotRows) {
        const date = new Date(row.month_start);
        const key = toMonthKey(date);
        const target = byMonth.get(key);
        if (!target) continue;
        snapshotMonthKeys.add(key);
        target.quizAttempts = Number(row.quiz_attempts || 0);
        target.pledgeLogs = Number(row.pledge_logs || 0);
        target.pledgeRecitations = Number(row.pledge_recitations || 0);
        target.gameSessions = Number(row.game_sessions || 0);
        target.pointsFromQuiz = Number(row.points_from_quiz || 0);
        target.pointsFromGames = Number(row.points_from_games || 0);
        target.totalActivities = Number(row.total_activities || 0);
        target.qualified = Boolean(row.certificate_qualified);
      }
    }

    const liveByMonth = new Map<string, Pick<MonthlySummary, 'quizAttempts' | 'pledgeLogs' | 'pledgeRecitations' | 'gameSessions' | 'pointsFromQuiz' | 'pointsFromGames'>>();
    const getLive = (key: string) => {
      const existing = liveByMonth.get(key);
      if (existing) return existing;
      const initial = {
        quizAttempts: 0,
        pledgeLogs: 0,
        pledgeRecitations: 0,
        gameSessions: 0,
        pointsFromQuiz: 0,
        pointsFromGames: 0,
      };
      liveByMonth.set(key, initial);
      return initial;
    };

    for (const row of quizRes.data || []) {
      if (!row.completed_at) continue;
      const key = toMonthKey(new Date(row.completed_at));
      if (!byMonth.has(key)) continue;
      const live = getLive(key);
      live.quizAttempts += 1;
      live.pointsFromQuiz += Number(row.score || 0);
    }

    for (const row of pledgeRes.data || []) {
      if (!row.created_at) continue;
      const key = toMonthKey(new Date(row.created_at));
      if (!byMonth.has(key)) continue;
      const live = getLive(key);
      live.pledgeLogs += 1;
      live.pledgeRecitations += Number(row.count || 0);
    }

    for (const row of gamesRows) {
      if (!row.played_at) continue;
      const key = toMonthKey(new Date(row.played_at));
      if (!byMonth.has(key)) continue;
      const live = getLive(key);
      live.gameSessions += 1;
      live.pointsFromGames += Number(row.points_earned || 0);
    }

    for (const key of monthKeys) {
      const target = byMonth.get(key);
      if (!target) continue;
      const live = liveByMonth.get(key);
      if (!live) continue;

      // If snapshot missing OR this is current month, use live values to avoid stale certificates.
      if (!snapshotMonthKeys.has(key) || key === currentMonthKey) {
        target.quizAttempts = live.quizAttempts;
        target.pledgeLogs = live.pledgeLogs;
        target.pledgeRecitations = live.pledgeRecitations;
        target.gameSessions = live.gameSessions;
        target.pointsFromQuiz = live.pointsFromQuiz;
        target.pointsFromGames = live.pointsFromGames;
        target.totalActivities = live.quizAttempts + live.pledgeLogs + live.gameSessions;
        target.qualified = target.totalActivities >= 3;
      }
    }

    const certificates = monthKeys
      .map((key) => byMonth.get(key)!)
      .map((month) => {
        const totalActivities = month.totalActivities || (month.quizAttempts + month.pledgeLogs + month.gameSessions);
        const qualified = month.qualified || totalActivities >= 3;
        return {
          ...month,
          totalActivities,
          qualified,
          certificateTitle: qualified ? 'Well Done Certificate' : null,
          certificateId: qualified ? `${userId}-${month.key}` : null,
        };
      });

    return NextResponse.json({
      user: userRes.data || { uid: userId },
      months: certificates,
      rule: 'Certificate unlocks with 3 or more monthly activities across quizzes, games, and pledge logs.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
