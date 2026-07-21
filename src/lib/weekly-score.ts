import { supabaseAdmin } from '@/lib/supabase-admin';
export { getScoreWeekRangeUtc, MAX_WEEKLY_SCORE } from '@/lib/weekly-score-core';
import { getZonedDateKey, MAX_WEEKLY_SCORE } from '@/lib/weekly-score-core';

function addActiveDay(days: Set<string>, value: string | null | undefined) {
  if (!value) return;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return;
  days.add(getZonedDateKey(parsed));
}

async function fetchWeeklyRecordings(weekStartIso: string, weekEndIso: string, userIds?: string[]) {
  const candidates: Array<'created_at' | 'submitted_at' | 'createdat'> = ['created_at', 'submitted_at', 'createdat'];

  for (const column of candidates) {
    let query = supabaseAdmin
      .from('recordings')
      .select(`user_id, ${column}`)
      .gte(column, weekStartIso)
      .lt(column, weekEndIso);

    if (userIds?.length) {
      query = query.in('user_id', userIds);
    }

    const res = await query;
    if (!res.error) return res;

    const msg = String(res.error.message || '').toLowerCase();
    if (!msg.includes(column)) return res;
  }

  return { data: [], error: null } as any;
}

export async function getWeeklyScoresForUsers(
  userIds: string[],
  weekStartIso: string,
  weekEndIso: string
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  if (!userIds.length) return scores;

  const activeDaysByUser = new Map<string, Set<string>>();
  for (const userId of userIds) {
    activeDaysByUser.set(userId, new Set());
  }

  const [weeklyAttemptsRes, weeklyGamesRes, weeklyPledgesRes, weeklyRecordingsRes, weeklyDonationsRes] = await Promise.all([
    supabaseAdmin
      .from('quiz_attempts')
      .select('user_id, completed_at')
      .in('user_id', userIds)
      .gte('completed_at', weekStartIso)
      .lt('completed_at', weekEndIso),
    supabaseAdmin
      .from('game_progress')
      .select('uid, playedat')
      .in('uid', userIds)
      .gte('playedat', weekStartIso)
      .lt('playedat', weekEndIso),
    supabaseAdmin
      .from('pledges')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .gte('created_at', weekStartIso)
      .lt('created_at', weekEndIso),
    fetchWeeklyRecordings(weekStartIso, weekEndIso, userIds),
    supabaseAdmin
      .from('kids_donations')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .gte('created_at', weekStartIso)
      .lt('created_at', weekEndIso),
  ]);

  const markDay = (userId: string, value: string | null | undefined) => {
    if (!userId) return;
    if (!activeDaysByUser.has(userId)) {
      activeDaysByUser.set(userId, new Set());
    }
    addActiveDay(activeDaysByUser.get(userId)!, value);
  };

  for (const row of weeklyAttemptsRes.data || []) {
    markDay(String((row as any).user_id || ''), (row as any).completed_at);
  }

  for (const row of weeklyGamesRes.data || []) {
    markDay(String((row as any).uid || ''), (row as any).playedat);
  }

  for (const row of weeklyPledgesRes.data || []) {
    markDay(String((row as any).user_id || ''), (row as any).created_at);
  }

  for (const row of weeklyRecordingsRes.data || []) {
    const timestamp =
      (row as any).created_at || (row as any).submitted_at || (row as any).createdat;
    markDay(String((row as any).user_id || ''), timestamp);
  }

  if (!weeklyDonationsRes.error) {
    for (const row of weeklyDonationsRes.data || []) {
      markDay(String((row as any).user_id || ''), (row as any).created_at);
    }
  }

  for (const [userId, days] of activeDaysByUser) {
    scores.set(userId, Math.min(MAX_WEEKLY_SCORE, days.size));
  }

  return scores;
}

export async function getAllScoreWeekActiveUserIds(weekStartIso: string, weekEndIso: string): Promise<string[]> {
  const [weeklyAttemptsRes, weeklyGamesRes, weeklyPledgesRes, weeklyRecordingsRes, weeklyDonationsRes] = await Promise.all([
    supabaseAdmin
      .from('quiz_attempts')
      .select('user_id')
      .gte('completed_at', weekStartIso)
      .lt('completed_at', weekEndIso),
    supabaseAdmin
      .from('game_progress')
      .select('uid')
      .gte('playedat', weekStartIso)
      .lt('playedat', weekEndIso),
    supabaseAdmin
      .from('pledges')
      .select('user_id')
      .gte('created_at', weekStartIso)
      .lt('created_at', weekEndIso),
    fetchWeeklyRecordings(weekStartIso, weekEndIso),
    supabaseAdmin
      .from('kids_donations')
      .select('user_id')
      .gte('created_at', weekStartIso)
      .lt('created_at', weekEndIso),
  ]);

  const userIds = new Set<string>();

  for (const row of weeklyAttemptsRes.data || []) {
    const uid = String((row as any).user_id || '');
    if (uid) userIds.add(uid);
  }
  for (const row of weeklyGamesRes.data || []) {
    const uid = String((row as any).uid || '');
    if (uid) userIds.add(uid);
  }
  for (const row of weeklyPledgesRes.data || []) {
    const uid = String((row as any).user_id || '');
    if (uid) userIds.add(uid);
  }
  for (const row of weeklyRecordingsRes.data || []) {
    const uid = String((row as any).user_id || '');
    if (uid) userIds.add(uid);
  }
  if (!weeklyDonationsRes.error) {
    for (const row of weeklyDonationsRes.data || []) {
      const uid = String((row as any).user_id || '');
      if (uid) userIds.add(uid);
    }
  }

  return [...userIds];
}
