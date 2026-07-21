import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const checkAdminAuth = (request: Request) => {
  const authHeader = request.headers.get('x-admin-auth');
  return authHeader === 'true';
};

function toMonthKey(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function buildMonthKeyList(months: number): string[] {
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

function resolveFeatureChallengeTitle(challengeId: string | null): string | null {
  if (!challengeId) return null;
  const map: Record<string, string> = {
    'quiz-starter': 'Quiz Starter Sprint',
    'word-hunt': 'Word Hunt Explorer',
    'durood-focus': 'Durood Focus Minute',
    'leaderboard-climb': 'Leaderboard Climb',
    'bring-a-friend': 'Bring a Friend',
  };
  return map[challengeId] || challengeId;
}

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const months = Math.max(1, Math.min(24, Number(searchParams.get('months') || '12')));

    if (!uid) {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }

    const monthKeys = buildMonthKeyList(months);
    const oldestKey = monthKeys[monthKeys.length - 1];
    const startIso = new Date(`${oldestKey}-01T00:00:00.000Z`).toISOString();

    const [userRes, pointsRes, quizRes, pledgeRes] = await Promise.all([
      supabaseAdmin.from('users').select('uid, name, email, points, weeklypoints, monthlypoints').eq('uid', uid).maybeSingle(),
      supabaseAdmin.from('users_points').select('total_points, weekly_points, monthly_points, today_points, badges, level').eq('user_id', uid).maybeSingle(),
      supabaseAdmin.from('quiz_attempts').select('score, completed_at').eq('user_id', uid).gte('completed_at', startIso),
      supabaseAdmin.from('pledges').select('count, created_at, type').eq('user_id', uid).gte('created_at', startIso),
    ]);

    let featureLabRows: Array<{
      date: string;
      good_deeds: string[] | null;
      challenge_id: string | null;
      challenge_roll: number | null;
      updated_at: string | null;
    }> = [];
    try {
      const featureRes = await supabaseAdmin
        .from('kids_zone_feature_progress')
        .select('date, good_deeds, challenge_id, challenge_roll, updated_at')
        .eq('user_id', uid)
        .gte('date', `${oldestKey}-01`)
        .order('date', { ascending: false });
      if (!featureRes.error && featureRes.data) {
        featureLabRows = featureRes.data as typeof featureLabRows;
      }
    } catch {
      featureLabRows = [];
    }

    let snapshotRows: Array<{
      month_start: string;
      quiz_attempts: number;
      points_from_quiz: number;
      pledge_logs: number;
      pledge_recitations: number;
      game_sessions: number;
      points_from_games: number;
      total_activities: number;
      certificate_qualified: boolean;
    }> = [];
    try {
      const snapshotRes = await supabaseAdmin
        .from('user_monthly_progress')
        .select('month_start, quiz_attempts, points_from_quiz, pledge_logs, pledge_recitations, game_sessions, points_from_games, total_activities, certificate_qualified')
        .eq('user_id', uid)
        .gte('month_start', `${oldestKey}-01`)
        .order('month_start', { ascending: false });
      if (!snapshotRes.error && snapshotRes.data) {
        snapshotRows = snapshotRes.data as typeof snapshotRows;
      }
    } catch {
      snapshotRows = [];
    }

    let gamesRows: Array<{ points: number | null; playedat: string | null }> = [];
    try {
      const gamesRes = await supabaseAdmin
        .from('game_progress')
        .select('points, playedat')
        .eq('uid', uid)
        .gte('playedat', startIso);
      if (!gamesRes.error && gamesRes.data) {
        gamesRows = gamesRes.data as Array<{ points: number | null; playedat: string | null }>;
      }
    } catch {
      gamesRows = [];
    }

    if (quizRes.error) return NextResponse.json({ error: quizRes.error.message }, { status: 500 });
    if (pledgeRes.error) return NextResponse.json({ error: pledgeRes.error.message }, { status: 500 });

    const monthMap = new Map<string, {
      key: string;
      label: string;
      quizAttempts: number;
      quizScorePoints: number;
      pledgeLogs: number;
      pledgeRecitations: number;
      gameSessions: number;
      gamePoints: number;
      totalActivities: number;
      certificateQualified: boolean;
    }>();
    const snapshotMonthKeys = new Set<string>();
    const currentMonthKey = toMonthKey(new Date());

    for (const key of monthKeys) {
      monthMap.set(key, {
        key,
        label: monthLabel(key),
        quizAttempts: 0,
        quizScorePoints: 0,
        pledgeLogs: 0,
        pledgeRecitations: 0,
        gameSessions: 0,
        gamePoints: 0,
        totalActivities: 0,
        certificateQualified: false,
      });
    }

    if (snapshotRows.length > 0) {
      for (const row of snapshotRows) {
        const key = toMonthKey(new Date(row.month_start));
        const month = monthMap.get(key);
        if (!month) continue;
        snapshotMonthKeys.add(key);
        month.quizAttempts = Number(row.quiz_attempts || 0);
        month.quizScorePoints = Number(row.points_from_quiz || 0);
        month.pledgeLogs = Number(row.pledge_logs || 0);
        month.pledgeRecitations = Number(row.pledge_recitations || 0);
        month.gameSessions = Number(row.game_sessions || 0);
        month.gamePoints = Number(row.points_from_games || 0);
        month.totalActivities = Number(row.total_activities || 0);
        month.certificateQualified = Boolean(row.certificate_qualified);
      }
    }

    const liveByMonth = new Map<string, {
      quizAttempts: number;
      quizScorePoints: number;
      pledgeLogs: number;
      pledgeRecitations: number;
      gameSessions: number;
      gamePoints: number;
    }>();
    const getLive = (key: string) => {
      const existing = liveByMonth.get(key);
      if (existing) return existing;
      const initial = {
        quizAttempts: 0,
        quizScorePoints: 0,
        pledgeLogs: 0,
        pledgeRecitations: 0,
        gameSessions: 0,
        gamePoints: 0,
      };
      liveByMonth.set(key, initial);
      return initial;
    };

    for (const row of quizRes.data || []) {
      if (!row.completed_at) continue;
      const key = toMonthKey(new Date(row.completed_at));
      if (!monthMap.has(key)) continue;
      const live = getLive(key);
      live.quizAttempts += 1;
      live.quizScorePoints += Number(row.score || 0);
    }

    for (const row of pledgeRes.data || []) {
      if (!row.created_at) continue;
      const key = toMonthKey(new Date(row.created_at));
      if (!monthMap.has(key)) continue;
      const live = getLive(key);
      live.pledgeLogs += 1;
      live.pledgeRecitations += Number(row.count || 0);
    }

    for (const row of gamesRows) {
      if (!row.playedat) continue;
      const key = toMonthKey(new Date(row.playedat));
      if (!monthMap.has(key)) continue;
      const live = getLive(key);
      live.gameSessions += 1;
      live.gamePoints += Number(row.points || 0);
    }

    for (const key of monthKeys) {
      const month = monthMap.get(key);
      if (!month) continue;
      const live = liveByMonth.get(key);
      if (!live) continue;

      // Keep past snapshots stable, but always keep current month live.
      if (!snapshotMonthKeys.has(key) || key === currentMonthKey) {
        month.quizAttempts = live.quizAttempts;
        month.quizScorePoints = live.quizScorePoints;
        month.pledgeLogs = live.pledgeLogs;
        month.pledgeRecitations = live.pledgeRecitations;
        month.gameSessions = live.gameSessions;
        month.gamePoints = live.gamePoints;
        month.totalActivities = live.quizAttempts + live.pledgeLogs + live.gameSessions;
        month.certificateQualified = month.totalActivities >= 3;
      }
    }

    const monthlyBreakdown = monthKeys.map((key) => {
      const month = monthMap.get(key)!;
      month.totalActivities = month.totalActivities || (month.quizAttempts + month.pledgeLogs + month.gameSessions);
      month.certificateQualified = month.certificateQualified || month.totalActivities >= 3;
      return month;
    });

    const totals = monthlyBreakdown.reduce(
      (acc, month) => {
        acc.quizAttempts += month.quizAttempts;
        acc.pledgeLogs += month.pledgeLogs;
        acc.pledgeRecitations += month.pledgeRecitations;
        acc.gameSessions += month.gameSessions;
        acc.certificateMonths += month.certificateQualified ? 1 : 0;
        return acc;
      },
      { quizAttempts: 0, pledgeLogs: 0, pledgeRecitations: 0, gameSessions: 0, certificateMonths: 0 }
    );

    const featureLabSummary = {
      trackedDays: featureLabRows.length,
      totalGoodDeeds: featureLabRows.reduce((sum, row) => sum + (Array.isArray(row.good_deeds) ? row.good_deeds.length : 0), 0),
      challengeDays: featureLabRows.reduce((sum, row) => sum + (row.challenge_id ? 1 : 0), 0),
      recent: featureLabRows.slice(0, 14).map((row) => ({
        date: row.date,
        goodDeedsCount: Array.isArray(row.good_deeds) ? row.good_deeds.length : 0,
        challengeId: row.challenge_id,
        challengeTitle: resolveFeatureChallengeTitle(row.challenge_id),
      })),
    };

    return NextResponse.json({
      user: userRes.data,
      points: pointsRes.data,
      totals,
      monthlyBreakdown,
      featureLab: featureLabSummary,
      certificateRule: '3 or more monthly activities across quizzes, games, and pledge logs',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
