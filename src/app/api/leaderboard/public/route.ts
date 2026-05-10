import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isTestModeEmail } from '@/lib/test-mode';

export const dynamic = 'force-dynamic';

const sanitizeName = (name: string | null | undefined, uid?: string | null) => {
  const t = (name ?? '').trim();
  if (!t) return 'Friend';
  if (uid && t === uid) return 'Friend';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
  if (isUuid) return 'Friend';
  return t;
};

const firstString = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

function getCurrentWeekRangeUtc() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;

  const weekStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
    0,
    0,
    0,
    0
  ));

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  return { weekStartIso: weekStart.toISOString(), weekEndIso: weekEnd.toISOString() };
}

function buildWeeklyChallenge(summary: { quizCount: number; gameCount: number; pledgeCount: number; recordingCount: number }) {
  const totalCompleted = summary.quizCount + summary.gameCount + summary.pledgeCount + summary.recordingCount;
  return totalCompleted >= 5;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tab = (url.searchParams.get('tab') || 'monthly').toLowerCase();
    const isMonthly = tab === 'monthly';
    
    // Order by the appropriate field based on tab
    const orderField = isMonthly ? 'monthly_points' : 'weekly_points';

    const { data, error } = await supabaseAdmin
      .from('users_points')
      .select('user_id,total_points,weekly_points,monthly_points,badges,level,last_earned_date,users(name,email,points,weeklypoints,monthlypoints)')
      .gt(orderField, 0)  // Only get users with points in this period
      .order(orderField, { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) {
      console.error('Leaderboard API error:', error);
      return NextResponse.json({ entries: [], lastWinner: null, error: error.message }, { status: 500 });
    }

    const filteredRows = (data || []).filter((row: any) => !isTestModeEmail(row.users?.email));
    const rawUserIds = filteredRows.map((row: any) => row.user_id).filter(Boolean);

    const profilesByUid = new Map<string, any>();
    if (rawUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('uid', rawUserIds);

      if (profilesError) {
        console.error('Leaderboard users profile lookup error:', profilesError);
      } else {
        for (const profile of profiles || []) {
          profilesByUid.set(String((profile as any).uid), profile);
        }
      }
    }

    const metadataByUserId = new Map<string, any>();
    try {
      const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (authUsersError) {
        console.warn('Leaderboard auth metadata lookup error:', authUsersError.message);
      } else {
        for (const authUser of authUsers?.users || []) {
          metadataByUserId.set(String((authUser as any).id), (authUser as any).user_metadata || {});
        }
      }
    } catch (authUsersException: any) {
      console.warn('Leaderboard auth metadata lookup threw:', authUsersException?.message || authUsersException);
    }

    const entriesBase = filteredRows
      .map((row: any) => {
      const displayName = sanitizeName(row.users?.name, row.user_id);
      const userProfile = profilesByUid.get(String(row.user_id)) || {};
      const userMeta = metadataByUserId.get(String(row.user_id)) || {};
      const madrasahName = firstString(
        userProfile.madrasahName,
        userProfile.madrasahname,
        userProfile.madrasah_name,
        userMeta.madrasahName,
        userMeta.madrasahname,
        userMeta.madrasah_name
      );
      const totalPoints = Number(row.total_points ?? row.users?.points ?? 0);
      const weeklyPoints = Number(row.weekly_points ?? row.users?.weeklypoints ?? 0);
      const monthlyPoints = Number(row.monthly_points ?? row.users?.monthlypoints ?? 0);
      
      // Use the appropriate points for display
      const displayPoints = isMonthly ? monthlyPoints : weeklyPoints;

      return {
        uid: row.user_id,
        name: displayName,
        madrasahName,
        level: row.level ?? 1,
        points: totalPoints,
        weeklyPoints,
        monthlyPoints,
        badges: row.badges ?? 0,
        lastPlayedDate: row.last_earned_date ?? null,
      };
    });

    const userIds = entriesBase.map((entry: any) => entry.uid).filter(Boolean);
    const winnerTickByUser = new Set<string>();
    const weeklyAttemptCountByUser = new Map<string, number>();
    const weeklyGameCountByUser = new Map<string, number>();
    const weeklyPledgeCountByUser = new Map<string, number>();
    const weeklyRecordingCountByUser = new Map<string, number>();

    if (userIds.length > 0) {
      const { data: winnerRows, error: winnerErr } = await supabaseAdmin
        .from('featured_winners')
        .select('user_id')
        .in('user_id', userIds);

      if (winnerErr) {
        if (winnerErr.code !== '42P01') {
          console.warn('Leaderboard featured winners lookup error:', winnerErr.message);
        }
      } else {
        for (const row of winnerRows || []) {
          const uid = String((row as any).user_id || '');
          if (!uid) continue;
          winnerTickByUser.add(uid);
        }
      }
    }

    if (userIds.length > 0) {
      const { weekStartIso, weekEndIso } = getCurrentWeekRangeUtc();
      const [weeklyAttemptsRes, weeklyGamesRes, weeklyPledgesRes, weeklyRecordingsRes] = await Promise.all([
        supabaseAdmin
          .from('quiz_attempts')
          .select('user_id')
          .in('user_id', userIds)
          .gte('completed_at', weekStartIso)
          .lt('completed_at', weekEndIso),
        supabaseAdmin
          .from('game_activity_logs')
          .select('user_id')
          .in('user_id', userIds)
          .gte('played_at', weekStartIso)
          .lt('played_at', weekEndIso),
        supabaseAdmin
          .from('pledges')
          .select('user_id')
          .in('user_id', userIds)
          .gte('created_at', weekStartIso)
          .lt('created_at', weekEndIso),
        supabaseAdmin
          .from('recordings')
          .select('user_id')
          .in('user_id', userIds)
          .gte('created_at', weekStartIso)
          .lt('created_at', weekEndIso),
      ]);

      if (weeklyAttemptsRes.error) {
        console.error('Leaderboard weekly attempts error:', weeklyAttemptsRes.error);
      } else {
        for (const row of weeklyAttemptsRes.data || []) {
          const uid = String((row as any).user_id || '');
          if (!uid) continue;
          weeklyAttemptCountByUser.set(uid, (weeklyAttemptCountByUser.get(uid) || 0) + 1);
        }
      }

      if (weeklyGamesRes.error) {
        console.error('Leaderboard weekly games error:', weeklyGamesRes.error);
      } else {
        for (const row of weeklyGamesRes.data || []) {
          const uid = String((row as any).user_id || '');
          if (!uid) continue;
          weeklyGameCountByUser.set(uid, (weeklyGameCountByUser.get(uid) || 0) + 1);
        }
      }

      if (weeklyPledgesRes.error) {
        console.error('Leaderboard weekly pledges error:', weeklyPledgesRes.error);
      } else {
        for (const row of weeklyPledgesRes.data || []) {
          const uid = String((row as any).user_id || '');
          if (!uid) continue;
          weeklyPledgeCountByUser.set(uid, (weeklyPledgeCountByUser.get(uid) || 0) + 1);
        }
      }

      if (weeklyRecordingsRes.error) {
        console.error('Leaderboard weekly recordings error:', weeklyRecordingsRes.error);
      } else {
        for (const row of weeklyRecordingsRes.data || []) {
          const uid = String((row as any).user_id || '');
          if (!uid) continue;
          weeklyRecordingCountByUser.set(uid, (weeklyRecordingCountByUser.get(uid) || 0) + 1);
        }
      }
    }

    const entries = entriesBase.map((entry: any) => ({
      ...entry,
      winnerTick: winnerTickByUser.has(String(entry.uid)),
      weeklyQuizAttempts: weeklyAttemptCountByUser.get(entry.uid) || 0,
      weeklyChallengeDone: buildWeeklyChallenge({
        quizCount: weeklyAttemptCountByUser.get(entry.uid) || 0,
        gameCount: weeklyGameCountByUser.get(entry.uid) || 0,
        pledgeCount: weeklyPledgeCountByUser.get(entry.uid) || 0,
        recordingCount: weeklyRecordingCountByUser.get(entry.uid) || 0,
      }),
    }));

    const { data: winnerData } = await supabaseAdmin
      .from('weekly_winners')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let lastWinner: any = null;
    if (winnerData?.user_id) {
      const { data: userData } = await supabaseAdmin.from('users').select('name,email').eq('uid', winnerData.user_id).maybeSingle();
      if (!isTestModeEmail((userData as any)?.email)) {
        const winnerName = sanitizeName(userData?.name, winnerData.user_id) || 'Champion';
        lastWinner = {
          uid: winnerData.user_id,
          name: winnerName,
          level: winnerData.level ?? 1,
          points: winnerData.weekly_points ?? 0,
          badges: winnerData.badges ?? 0,
        };
      }
    }

    const res = NextResponse.json({ entries, lastWinner, error: null });
    // Always serve fresh leaderboard data
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (e: any) {
    console.error('Leaderboard API exception:', e);
    return NextResponse.json({ entries: [], lastWinner: null, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
