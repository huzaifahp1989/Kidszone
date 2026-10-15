import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { getScoreWeekRangeUtc } from '@/lib/weekly-score-core';
import { getWeeklyScoresForUsers } from '@/lib/weekly-score';
import { getWeeklyStarsFromActiveDays } from '@/lib/leaderboard-rules';
import { pickContactNumberFromMetadata } from '@/lib/ensure-user-records';

export const dynamic = 'force-dynamic';

type ActivitySummary = {
  quizAttempts: number;
  gameSessions: number;
  kidsZoneDays: number;
  goodDeeds: number;
  challenges: number;
};

const emptyActivity = (): ActivitySummary => ({
  quizAttempts: 0,
  gameSessions: 0,
  kidsZoneDays: 0,
  goodDeeds: 0,
  challenges: 0,
});

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);
    const sinceIso = since.toISOString();
    const sinceDate = sinceIso.slice(0, 10);

    const [usersRes, pointsRes, quizRes, gamesRes, kidsZoneRes] = await Promise.all([
      supabaseAdmin.from('users').select('*').order('name'),
      supabaseAdmin.from('users_points').select('user_id,total_points,weekly_points,monthly_points,today_points'),
      supabaseAdmin.from('quiz_attempts').select('user_id,completed_at').gte('completed_at', sinceIso),
      supabaseAdmin.from('game_progress').select('uid,playedat,gameid').gte('playedat', sinceIso),
      supabaseAdmin
        .from('kids_zone_feature_progress')
        .select('user_id,date,good_deeds,challenge_id,updated_at')
        .gte('date', sinceDate),
    ]);

    if (usersRes.error) throw usersRes.error;
    if (pointsRes.error) throw pointsRes.error;

    const userIds = (usersRes.data || []).map((user) => String(user.uid || '')).filter(Boolean);
    const { weekStartIso, weekEndIso, weekStartDate, weekEndDate } = getScoreWeekRangeUtc();
    const [weeklyScores, authUsersRes] = await Promise.all([
      getWeeklyScoresForUsers(userIds, weekStartIso, weekEndIso),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const authMetadataByUser = new Map(
      (authUsersRes.data?.users || []).map((user) => [user.id, user.user_metadata || {}])
    );

    const missingContactBackfills = (usersRes.data || []).flatMap((user) => {
      const existing = user.contact_number || user.contactnumber || user.contactNumber || '';
      const fromMetadata = pickContactNumberFromMetadata(authMetadataByUser.get(String(user.uid)));
      if (existing || !fromMetadata) return [];

      return [
        (async () => {
          for (const column of ['contact_number', 'contactnumber', 'contactNumber'] as const) {
            const { error } = await supabaseAdmin
              .from('users')
              .update({ [column]: fromMetadata })
              .eq('uid', user.uid);
            if (!error || error.code !== '42703') break;
          }
        })(),
      ];
    });
    await Promise.all(missingContactBackfills);

    const pointsByUser = new Map((pointsRes.data || []).map((row) => [String(row.user_id), row]));
    const activityByUser = new Map<string, ActivitySummary>();
    const lastActiveByUser = new Map<string, string>();
    const recentByUser = new Map<string, string[]>();

    const touch = (uid: string, at: string, label: string) => {
      if (!uid || !at) return;
      const current = lastActiveByUser.get(uid);
      if (!current || Date.parse(at) > Date.parse(current)) lastActiveByUser.set(uid, at);
      const recent = recentByUser.get(uid) || [];
      if (!recent.includes(label) && recent.length < 4) recent.push(label);
      recentByUser.set(uid, recent);
    };

    for (const row of quizRes.data || []) {
      const uid = String(row.user_id || '');
      const summary = activityByUser.get(uid) || emptyActivity();
      summary.quizAttempts += 1;
      activityByUser.set(uid, summary);
      touch(uid, String(row.completed_at || ''), 'Quiz');
    }

    for (const row of gamesRes.data || []) {
      const uid = String(row.uid || '');
      const summary = activityByUser.get(uid) || emptyActivity();
      summary.gameSessions += 1;
      activityByUser.set(uid, summary);
      touch(uid, String(row.playedat || ''), row.gameid ? `Game: ${row.gameid}` : 'Game');
    }

    for (const row of kidsZoneRes.data || []) {
      const uid = String(row.user_id || '');
      const summary = activityByUser.get(uid) || emptyActivity();
      const deeds = Array.isArray(row.good_deeds) ? row.good_deeds.length : 0;
      summary.kidsZoneDays += 1;
      summary.goodDeeds += deeds;
      if (row.challenge_id) summary.challenges += 1;
      activityByUser.set(uid, summary);
      const labels = [deeds ? `${deeds} good deed${deeds === 1 ? '' : 's'}` : '', row.challenge_id ? `Challenge: ${row.challenge_id}` : ''].filter(Boolean);
      touch(uid, String(row.updated_at || `${row.date}T00:00:00.000Z`), labels.join(', ') || 'Kids Zone');
    }

    const now = Date.now();
    const users = (usersRes.data || []).map((user) => {
      const uid = String(user.uid);
      const points = pointsByUser.get(uid);
      const activity = activityByUser.get(uid) || emptyActivity();
      const lastActiveAt = lastActiveByUser.get(uid) || null;
      const inactiveDays = lastActiveAt ? Math.max(0, Math.floor((now - Date.parse(lastActiveAt)) / 86400000)) : null;
      const activeDays = Number(weeklyScores.get(uid) || 0);
      const contactNumber =
        user.contact_number ||
        user.contactnumber ||
        user.contactNumber ||
        pickContactNumberFromMetadata(authMetadataByUser.get(uid));

      return {
        uid,
        name: user.name || 'Friend',
        email: user.email || '',
        contactNumber,
        totalPoints: Number(points?.total_points || 0),
        weeklyPoints: Number(points?.weekly_points || 0),
        monthlyPoints: Number(points?.monthly_points || 0),
        todayPoints: Number(points?.today_points || 0),
        activeDays,
        weeklyStars: getWeeklyStarsFromActiveDays(activeDays),
        lastActiveAt,
        inactiveDays,
        activity,
        recentActions: recentByUser.get(uid) || [],
      };
    });

    users.sort((a, b) => (Date.parse(b.lastActiveAt || '') || 0) - (Date.parse(a.lastActiveAt || '') || 0));

    return NextResponse.json({
      periodDays: 30,
      week: { weekStartDate, weekEndDate },
      summary: {
        totalUsers: users.length,
        activeThisWeek: users.filter((user) => user.activeDays > 0).length,
        activeLast30Days: users.filter((user) => user.lastActiveAt).length,
        kidsZoneUsers: users.filter((user) => user.activity.kidsZoneDays > 0).length,
      },
      warnings: [quizRes.error?.message, gamesRes.error?.message, kidsZoneRes.error?.message].filter(Boolean),
      users,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String(error.message)
          : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}