import { supabaseAdmin } from '@/lib/supabase-admin';

export type WeeklyActivitySummary = {
  quizCount: number;
  gameCount: number;
  pledgeCount: number;
  recordingCount: number;
  totalCount: number;
};

export function getCurrentWeekRangeUtc() {
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

export function getCurrentMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function shouldResetMonthlyPoints(lastEarnedDate: string | null | undefined, date = new Date()): boolean {
  if (!lastEarnedDate) return false;
  const earnedMonth = String(lastEarnedDate).slice(0, 7);
  return earnedMonth !== getCurrentMonthKey(date);
}

async function fetchWeeklyRecordings(weekStartIso: string, weekEndIso: string, userIds?: string[]) {
  const candidates: Array<'created_at' | 'submitted_at' | 'createdat'> = ['created_at', 'submitted_at', 'createdat'];

  for (const column of candidates) {
    let query = supabaseAdmin
      .from('recordings')
      .select('user_id')
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

function emptySummary(): WeeklyActivitySummary {
  return { quizCount: 0, gameCount: 0, pledgeCount: 0, recordingCount: 0, totalCount: 0 };
}

export function summarizeWeeklyActivity(parts: Omit<WeeklyActivitySummary, 'totalCount'>): WeeklyActivitySummary {
  const totalCount = parts.quizCount + parts.gameCount + parts.pledgeCount + parts.recordingCount;
  return { ...parts, totalCount };
}

export async function getWeeklyActivityCountsForUsers(
  userIds: string[],
  weekStartIso: string,
  weekEndIso: string
): Promise<Map<string, WeeklyActivitySummary>> {
  const counts = new Map<string, WeeklyActivitySummary>();
  if (!userIds.length) return counts;

  for (const userId of userIds) {
    counts.set(userId, emptySummary());
  }

  const [weeklyAttemptsRes, weeklyGamesRes, weeklyPledgesRes, weeklyRecordingsRes] = await Promise.all([
    supabaseAdmin
      .from('quiz_attempts')
      .select('user_id')
      .in('user_id', userIds)
      .gte('completed_at', weekStartIso)
      .lt('completed_at', weekEndIso),
    supabaseAdmin
      .from('game_progress')
      .select('uid')
      .in('uid', userIds)
      .gte('playedat', weekStartIso)
      .lt('playedat', weekEndIso),
    supabaseAdmin
      .from('pledges')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', weekStartIso)
      .lt('created_at', weekEndIso),
    fetchWeeklyRecordings(weekStartIso, weekEndIso, userIds),
  ]);

  const bump = (userId: string, key: keyof Omit<WeeklyActivitySummary, 'totalCount'>) => {
    const current = counts.get(userId) || emptySummary();
    current[key] += 1;
    current.totalCount = current.quizCount + current.gameCount + current.pledgeCount + current.recordingCount;
    counts.set(userId, current);
  };

  for (const row of weeklyAttemptsRes.data || []) {
    const uid = String((row as any).user_id || '');
    if (uid) bump(uid, 'quizCount');
  }

  for (const row of weeklyGamesRes.data || []) {
    const uid = String((row as any).uid || '');
    if (uid) bump(uid, 'gameCount');
  }

  for (const row of weeklyPledgesRes.data || []) {
    const uid = String((row as any).user_id || '');
    if (uid) bump(uid, 'pledgeCount');
  }

  for (const row of weeklyRecordingsRes.data || []) {
    const uid = String((row as any).user_id || '');
    if (uid) bump(uid, 'recordingCount');
  }

  return counts;
}

export async function getAllWeeklyActiveUserIds(weekStartIso: string, weekEndIso: string): Promise<string[]> {
  const [weeklyAttemptsRes, weeklyGamesRes, weeklyPledgesRes, weeklyRecordingsRes] = await Promise.all([
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

  return [...userIds];
}
