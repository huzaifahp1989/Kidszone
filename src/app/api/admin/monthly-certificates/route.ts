import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isTestModeEmail } from '@/lib/test-mode';
import {
  getAllScoreWeekActiveUserIds,
  getScoreWeekRangeUtc,
  getWeeklyScoresForUsers,
  MAX_WEEKLY_SCORE,
} from '@/lib/weekly-score';
import { getWeeklyActivityCountsForUsers, getAllWeeklyActiveUserIds } from '@/lib/weekly-activity';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { WEEKLY_DRAW_MIN_POINTS } from '@/lib/leaderboard-rules';

export const dynamic = 'force-dynamic';

type Category = 'monthly_points' | 'always_active';
type Tier = 'gold' | 'silver' | 'bronze' | 'participation' | 'activity';

type Candidate = {
  userId: string;
  name: string;
  monthlyPoints: number;
  monthlyActivityCount: number;
  activeWeeksInMonth: number;
  consecutiveActiveMonths: number;
  badges: number;
  level: number;
  score: number;
};

const DEFAULT_GOLD = 3;
const DEFAULT_SILVER = 5;
const DEFAULT_BRONZE = 10;
const DEFAULT_PARTICIPATION_MAX = 200;

const MIN_ALWAYS_ACTIVE_WEEKS = 3; // active on at least 3 of 4 weeks in month
const MIN_ALWAYS_ACTIVE_POINTS = Math.max(50, WEEKLY_DRAW_MIN_POINTS * 2);
const MIN_ALWAYS_ACTIVE_ACTIVITY = 12;

function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7);
}

function getUtcMonthRange(year: number, month0Indexed: number) {
  const monthStart = new Date(Date.UTC(year, month0Indexed, 1));
  const monthEnd = new Date(Date.UTC(year, month0Indexed + 1, 1));
  const monthStartIso = monthStart.toISOString().slice(0, 10);
  const monthEndIso = new Date(monthEnd.getTime() - 1).toISOString().slice(0, 10);
  return { monthStartIso, monthEndIso, monthStart, monthEnd };
}

function getMonthRangeByMonthStart(monthStartIso: string) {
  const [y, m] = monthStartIso.split('-').map(Number);
  return getUtcMonthRange(y, m - 1);
}

function getAllWeeksInMonth(monthStartIso: string, monthEndIso: string): string[] {
  const starts = new Set<string>();
  let cursor = new Date(monthStartIso + 'T00:00:00Z');
  const end = new Date(monthEndIso + 'T23:59:59Z');
  while (cursor <= end) {
    const { weekStartIso } = getScoreWeekRangeUtc(cursor);
    starts.add(weekStartIso);
    cursor = new Date(cursor.getTime() + 7 * 24 * 3600 * 1000);
  }
  return [...starts].sort();
}

function currentMonthStartIso(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function previousMonthStartIso(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
}

function isAdmin(request: Request) {
  return request.headers.get('x-admin-auth') === 'true';
}

function pointsForTier(tier: Tier): number {
  switch (tier) {
    case 'gold':
      return 120;
    case 'silver':
      return 75;
    case 'bronze':
      return 35;
    case 'participation':
      return 10;
    case 'activity':
      return 20;
  }
}

async function buildMonthlyCandidates(
  monthStartIso: string,
  monthEndIso: string
): Promise<Map<string, Candidate>> {
  const candidates = new Map<string, Candidate>();
  const weekStarts = getAllWeeksInMonth(monthStartIso, monthEndIso);

  const activeUserIds = new Set<string>();
  await Promise.all(
    weekStarts.map(async (ws) => {
      const { weekEndIso } = getScoreWeekRangeUtc(new Date(ws));
      const [s1, s2] = await Promise.all([
        getAllScoreWeekActiveUserIds(ws, weekEndIso),
        getAllWeeklyActiveUserIds(ws, weekEndIso),
      ]);
      for (const u of s1) activeUserIds.add(u);
      for (const u of s2) activeUserIds.add(u);
    })
  );

  const { data: scoredRows, error: scoredError } = await supabaseAdmin
    .from('users_points')
    .select('user_id,monthly_points,badges,level,last_earned_date')
    .gte('monthly_points', 0);

  if (scoredError) throw scoredError;

  for (const row of scoredRows || []) {
    const userId = String(row.user_id || '');
    if (!userId) continue;
    candidates.set(userId, {
      userId,
      name: '',
      monthlyPoints: Number(row.monthly_points) || 0,
      monthlyActivityCount: 0,
      activeWeeksInMonth: 0,
      consecutiveActiveMonths: 0,
      badges: Number(row.badges) || 0,
      level: Number(row.level) || 1,
      score: 0,
    });
  }

  for (const uid of activeUserIds) {
    if (!candidates.has(uid)) {
      candidates.set(uid, {
        userId: uid,
        name: '',
        monthlyPoints: 0,
        monthlyActivityCount: 0,
        activeWeeksInMonth: 0,
        consecutiveActiveMonths: 0,
        badges: 0,
        level: 1,
        score: 0,
      });
    }
  }

  const userIds = [...candidates.keys()];
  if (userIds.length === 0) return candidates;

  const [activeWeeksByUser, activityByUser, weeklyScoresByWeek, { data: authUsers }, { data: profileRows }] =
    await Promise.all([
      (async () => {
        const map = new Map<string, number>();
        await Promise.all(
          weekStarts.map(async (ws) => {
            const { weekEndIso } = getScoreWeekRangeUtc(new Date(ws));
            const users = new Set<string>();
            const [s1, s2] = await Promise.all([
              getAllScoreWeekActiveUserIds(ws, weekEndIso),
              getAllWeeklyActiveUserIds(ws, weekEndIso),
            ]);
            for (const u of s1) users.add(u);
            for (const u of s2) users.add(u);
            for (const u of users) {
              if (!userIds.includes(u)) continue;
              map.set(u, (map.get(u) || 0) + 1);
            }
          })
        );
        return map;
      })(),
      (async () => {
        const combined = new Map<string, { totalCount: number }>();
        await Promise.all(
          weekStarts.map(async (ws) => {
            const { weekEndIso } = getScoreWeekRangeUtc(new Date(ws));
            const wk = await getWeeklyActivityCountsForUsers(userIds, ws, weekEndIso);
            for (const [uid, val] of wk.entries()) {
              const prev = combined.get(uid) || { totalCount: 0 };
              prev.totalCount += Number(val.totalCount) || 0;
              combined.set(uid, prev);
            }
          })
        );
        return combined;
      })(),
      (async () => {
        const map = new Map<string, Map<string, number>>();
        await Promise.all(
          weekStarts.map(async (ws) => {
            const { weekEndIso } = getScoreWeekRangeUtc(new Date(ws));
            const wk = await getWeeklyScoresForUsers(userIds, ws, weekEndIso);
            map.set(ws, wk);
          })
        );
        return map;
      })(),
      (async () => {
        try {
          return await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        } catch {
          return { data: { users: [] } as any, error: null } as any;
        }
      })(),
      supabaseAdmin.from('users').select('uid, name, age').in('uid', userIds),
    ]);

  const metadataByUser = new Map<string, any>();
  for (const u of (authUsers as any)?.users || []) {
    const uid = String(u.id || '');
    if (uid) metadataByUser.set(uid, u.user_metadata || {});
  }
  const profileByUser = new Map<string, any>();
  for (const row of profileRows || []) {
    profileByUser.set(String((row as any).uid || ''), row);
  }

  // Consecutive active months: count current + N previous months in which user had either points >0 or any active weeks/activity.
  const consecutiveMap = new Map<string, number>();
  try {
    const monthsBack = 5;
    const monthKeys: string[] = [];
    const cur = new Date(monthStartIso + 'T00:00:00Z');
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() - i, 1));
      monthKeys.push(d.toISOString().slice(0, 10));
    }
    const monthsByUser = new Map<string, Map<string, boolean>>();
    await Promise.all(
      monthKeys.map(async (ms) => {
        const { monthStartIso: msi, monthEndIso: mei } = getMonthRangeByMonthStart(ms);
        const wss = getAllWeeksInMonth(msi, mei);
        const activeUsers = new Set<string>();
        await Promise.all(
          wss.map(async (ws) => {
            const { weekEndIso } = getScoreWeekRangeUtc(new Date(ws));
            const [a, b] = await Promise.all([
              getAllScoreWeekActiveUserIds(ws, weekEndIso),
              getAllWeeklyActiveUserIds(ws, weekEndIso),
            ]);
            for (const u of a) if (userIds.includes(u)) activeUsers.add(u);
            for (const u of b) if (userIds.includes(u)) activeUsers.add(u);
          })
        );
        const { data: ptsRows } = await supabaseAdmin
          .from('users_points')
          .select('user_id,monthly_points')
          .gte('monthly_points', 1);
        const highPointsUsers = new Set<string>();
        for (const r of ptsRows || []) {
          if (Number((r as any).monthly_points) >= 5) highPointsUsers.add(String((r as any).user_id));
        }
        for (const uid of userIds) {
          const bucket = monthsByUser.get(uid) || new Map<string, boolean>();
          bucket.set(ms, activeUsers.has(uid) || highPointsUsers.has(uid));
          monthsByUser.set(uid, bucket);
        }
      })
    );
    for (const uid of userIds) {
      let streak = 0;
      for (const ms of monthKeys) {
        const active = monthsByUser.get(uid)?.get(ms) === true;
        if (active) streak++;
        else break;
      }
      consecutiveMap.set(uid, streak);
    }
  } catch {
    /* best-effort */
  }

  for (const [userId, cand] of candidates.entries()) {
    const profile = profileByUser.get(userId) || {};
    const meta = metadataByUser.get(userId) || {};
    const email: string | null | undefined =
      (meta?.email as any) || profile?.email || profile?.parent_email || null;
    if (email && isTestModeEmail(email)) {
      candidates.delete(userId);
      continue;
    }
    cand.name =
      String(profile.name || meta.name || '').trim() ||
      String(meta.full_name || meta.username || '').trim() ||
      'Young Scholar';
    cand.activeWeeksInMonth = activeWeeksByUser.get(userId) || 0;
    cand.monthlyActivityCount = activityByUser.get(userId)?.totalCount || 0;
    cand.consecutiveActiveMonths = consecutiveMap.get(userId) || 0;

    let weeklyScoreAgg = 0;
    for (const [, wkMap] of weeklyScoresByWeek.entries()) {
      weeklyScoreAgg += wkMap.get(userId) || 0;
    }

    const totalMaxWeeks = Math.max(1, weeklyScoresByWeek.size);
    const normalizedPts = Math.max(
      0,
      Math.min(1, cand.monthlyPoints / Math.max(1, WEEKLY_DRAW_MIN_POINTS * 8))
    );
    const normalizedAct = Math.max(0, Math.min(1, cand.monthlyActivityCount / 150));
    const normalizedWeeks = Math.max(0, Math.min(1, cand.activeWeeksInMonth / 4));
    const normalizedWkScore = Math.max(0, Math.min(1, weeklyScoreAgg / Math.max(1, MAX_WEEKLY_SCORE * totalMaxWeeks)));

    cand.score =
      normalizedPts * 0.55 + normalizedAct * 0.15 + normalizedWeeks * 0.2 + normalizedWkScore * 0.1;
  }

  return candidates;
}

function chooseMonthlyPointsAwards(
  candidates: Candidate[],
  opts: { goldCount: number; silverCount: number; bronzeCount: number; participationMax: number }
) {
  const sorted = [...candidates].sort((a, b) => {
    if (b.monthlyPoints !== a.monthlyPoints) return b.monthlyPoints - a.monthlyPoints;
    if (b.activeWeeksInMonth !== a.activeWeeksInMonth) return b.activeWeeksInMonth - a.activeWeeksInMonth;
    if (b.monthlyActivityCount !== a.monthlyActivityCount)
      return b.monthlyActivityCount - a.monthlyActivityCount;
    return a.name.localeCompare(b.name);
  });

  const awards: Array<Candidate & { rank: number; tier: Tier; category: Category }> = [];
  const minPts = Math.max(25, Math.floor(WEEKLY_DRAW_MIN_POINTS * 0.75));
  sorted.forEach((cand, idx) => {
    const rank = idx + 1;
    let tier: Tier = 'participation';
    if (rank <= opts.goldCount) tier = 'gold';
    else if (rank <= opts.goldCount + opts.silverCount) tier = 'silver';
    else if (rank <= opts.goldCount + opts.silverCount + opts.bronzeCount) tier = 'bronze';
    const qualifies =
      cand.monthlyPoints >= minPts ||
      cand.activeWeeksInMonth >= 2 ||
      cand.monthlyActivityCount >= 8;
    if (tier !== 'participation' && qualifies) {
      awards.push({ ...cand, rank, tier, category: 'monthly_points' });
      return;
    }
    if (qualifies && tier === 'participation') {
      const participationCount = awards.filter(
        (a) => a.tier === 'participation' && a.category === 'monthly_points'
      ).length;
      if (participationCount < opts.participationMax) {
        awards.push({ ...cand, rank, tier, category: 'monthly_points' });
      }
    }
  });
  return awards;
}

function chooseAlwaysActiveAwards(
  candidates: Candidate[]
): Array<Candidate & { rank: number; tier: Tier; category: Category }> {
  const filtered = candidates.filter(
    (c) =>
      c.activeWeeksInMonth >= MIN_ALWAYS_ACTIVE_WEEKS &&
      (c.monthlyPoints >= MIN_ALWAYS_ACTIVE_POINTS || c.monthlyActivityCount >= MIN_ALWAYS_ACTIVE_ACTIVITY)
  );
  filtered.sort((a, b) => {
    if (b.consecutiveActiveMonths !== a.consecutiveActiveMonths)
      return b.consecutiveActiveMonths - a.consecutiveActiveMonths;
    if (b.activeWeeksInMonth !== a.activeWeeksInMonth) return b.activeWeeksInMonth - a.activeWeeksInMonth;
    if (b.monthlyActivityCount !== a.monthlyActivityCount)
      return b.monthlyActivityCount - a.monthlyActivityCount;
    if (b.monthlyPoints !== a.monthlyPoints) return b.monthlyPoints - a.monthlyPoints;
    return a.name.localeCompare(b.name);
  });
  return filtered.map((cand, idx) => ({
    ...cand,
    rank: idx + 1,
    tier: 'activity',
    category: 'always_active' as const,
  }));
}

type Award = Candidate & { rank: number; tier: Tier; category: Category };

function summarizeMonth(date = new Date()) {
  return {
    current: currentMonthStartIso(date),
    previous: previousMonthStartIso(date),
  };
}

export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const mode = (url.searchParams.get('mode') || 'preview').toLowerCase();
  const category = ((url.searchParams.get('category') || 'both') as string).toLowerCase() as
    | 'monthly_points'
    | 'always_active'
    | 'both';

  const month = url.searchParams.get('month') || summarizeMonth().previous;
  const { monthStartIso, monthEndIso } = getMonthRangeByMonthStart(month);

  try {
    if (mode === 'history') {
      const { data, error } = await supabaseAdmin
        .from('monthly_certificates')
        .select('*')
        .order('month_start_date', { ascending: false })
        .order('category', { ascending: true })
        .order('rank', { ascending: true })
        .limit(1500);
      if (error && String(error.code) !== '42P01') throw error;
      const byMonth = new Map<string, Map<string, any[]>>();
      for (const row of (data || []) as any[]) {
        const key = String(row.month_start_date);
        const cat = String(row.category || 'monthly_points');
        const monthBucket = byMonth.get(key) || new Map<string, any[]>();
        const list = monthBucket.get(cat) || [];
        list.push(row);
        monthBucket.set(cat, list);
        byMonth.set(key, monthBucket);
      }
      const months = [...byMonth.entries()]
        .map(([m, catMap]) => ({
          month_start_date: m,
          counts: {
            monthly_points: catMap.get('monthly_points')?.length || 0,
            always_active: catMap.get('always_active')?.length || 0,
          },
          rows: [...(catMap.get('monthly_points') || []), ...(catMap.get('always_active') || [])],
        }))
        .sort((a, b) => (a.month_start_date < b.month_start_date ? 1 : -1));
      return NextResponse.json({ success: true, months });
    }

    const candidateMap = await buildMonthlyCandidates(monthStartIso, monthEndIso);
    const candidates = [...candidateMap.values()].sort((a, b) => b.score - a.score);

    const gold = Number(url.searchParams.get('gold')) || DEFAULT_GOLD;
    const silver = Number(url.searchParams.get('silver')) || DEFAULT_SILVER;
    const bronze = Number(url.searchParams.get('bronze')) || DEFAULT_BRONZE;
    const participation = Number(url.searchParams.get('participation')) || DEFAULT_PARTICIPATION_MAX;

    const monthlyPointsAwards = chooseMonthlyPointsAwards(candidates, {
      goldCount: gold,
      silverCount: silver,
      bronzeCount: bronze,
      participationMax: participation,
    });
    const alwaysActiveAwards = chooseAlwaysActiveAwards(candidates);

    const awards: Award[] = [];
    if (category === 'monthly_points' || category === 'both') awards.push(...monthlyPointsAwards);
    if (category === 'always_active' || category === 'both') awards.push(...alwaysActiveAwards);

    return NextResponse.json({
      success: true,
      month: { month_start_date: monthStartIso, month_end_date: monthEndIso, monthKey: monthKeyFromIso(monthStartIso) },
      candidateCount: candidates.length,
      awards: awards.map((a) => ({
        userId: a.userId,
        name: a.name,
        category: a.category,
        rank: a.rank,
        tier: a.tier,
        monthlyPoints: a.monthlyPoints,
        monthlyActivityCount: a.monthlyActivityCount,
        activeWeeksInMonth: a.activeWeeksInMonth,
        consecutiveActiveMonths: a.consecutiveActiveMonths,
        badges: a.badges,
        level: a.level,
        score: a.score,
        points_to_award: pointsForTier(a.tier),
      })),
      thresholds: {
        always_active: {
          min_active_weeks: MIN_ALWAYS_ACTIVE_WEEKS,
          min_points: MIN_ALWAYS_ACTIVE_POINTS,
          min_activity: MIN_ALWAYS_ACTIVE_ACTIVITY,
        },
      },
    });
  } catch (e: any) {
    console.error('[admin/monthly-certificates GET]', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to load monthly certificates.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const month = String(body?.month || '').trim() || summarizeMonth().previous;
    const gold = Number(body?.goldCount) || DEFAULT_GOLD;
    const silver = Number(body?.silverCount) || DEFAULT_SILVER;
    const bronze = Number(body?.bronzeCount) || DEFAULT_BRONZE;
    const participation = Number(body?.participationMax) || DEFAULT_PARTICIPATION_MAX;
    const category = ((String(body?.category || 'both') as string).toLowerCase() || 'both') as
      | 'monthly_points'
      | 'always_active'
      | 'both';
    const dryRun = body?.dryRun === false ? false : true;
    const issuedBy = String(body?.issuedBy || '').trim() || null;

    const { monthStartIso, monthEndIso } = getMonthRangeByMonthStart(month);
    const candidateMap = await buildMonthlyCandidates(monthStartIso, monthEndIso);
    const candidates = [...candidateMap.values()].sort((a, b) => b.score - a.score);

    const monthlyPointsAwards = chooseMonthlyPointsAwards(candidates, {
      goldCount: gold,
      silverCount: silver,
      bronzeCount: bronze,
      participationMax: participation,
    });
    const alwaysActiveAwards = chooseAlwaysActiveAwards(candidates);

    const awards: Award[] = [];
    if (category === 'monthly_points' || category === 'both') awards.push(...monthlyPointsAwards);
    if (category === 'always_active' || category === 'both') awards.push(...alwaysActiveAwards);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        month: { month_start_date: monthStartIso, month_end_date: monthEndIso },
        preview: awards.map((a) => ({
          userId: a.userId,
          name: a.name,
          category: a.category,
          rank: a.rank,
          tier: a.tier,
          monthlyPoints: a.monthlyPoints,
          monthlyActivityCount: a.monthlyActivityCount,
          activeWeeksInMonth: a.activeWeeksInMonth,
          consecutiveActiveMonths: a.consecutiveActiveMonths,
          points_to_award: pointsForTier(a.tier),
        })),
      });
    }

    const { data: existingRows, error: existingErr } = await supabaseAdmin
      .from('monthly_certificates')
      .select('month_start_date, user_id, category, tier, rank');
    if (existingErr && String(existingErr.code) !== '42P01') throw existingErr;
    const existingByKey = new Set<string>();
    for (const row of (existingRows || []) as any[]) {
      existingByKey.add(`${row.month_start_date}|${row.user_id}|${row.category}`);
    }

    const insertedRows: any[] = [];
    const skippedRows: any[] = [];
    let totalPointsAwarded = 0;

    for (const award of awards) {
      const key = `${monthStartIso}|${award.userId}|${award.category}`;
      if (existingByKey.has(key)) {
        skippedRows.push({ userId: award.userId, category: award.category, reason: 'already_issued' });
        continue;
      }
      const pts = pointsForTier(award.tier);
      const insertPayload = {
        month_start_date: monthStartIso,
        user_id: award.userId,
        user_name: award.name || 'Young Scholar',
        category: award.category,
        rank: award.rank,
        tier: award.tier,
        monthly_points: award.monthlyPoints,
        monthly_activity_count: award.monthlyActivityCount,
        active_weeks_in_month: award.activeWeeksInMonth,
        consecutive_active_months: award.consecutiveActiveMonths,
        badges_at_award: award.badges,
        level_at_award: award.level,
        points_awarded: pts,
        issued_by: issuedBy,
        issued_at: new Date().toISOString(),
      };
      const { error: insErr } = await supabaseAdmin.from('monthly_certificates').insert(insertPayload);
      if (insErr) {
        skippedRows.push({ userId: award.userId, category: award.category, reason: insErr.message });
        continue;
      }
      try {
        const result = await awardPointsWithDailyCapByUserId(award.userId, pts);
        totalPointsAwarded += result?.pointsAwarded ?? 0;
      } catch {
        /* best-effort */
      }
      try {
        const { error: badgeErr } = await supabaseAdmin.rpc('increment_user_badges_unsafe', {
          uid_input: award.userId,
          delta: award.tier === 'activity' ? 1 : award.tier === 'gold' ? 2 : 1,
        } as any);
        if (badgeErr) {
          await supabaseAdmin
            .from('users_points')
            .update({ badges: (award.badges || 0) + (award.tier === 'gold' ? 2 : 1) })
            .eq('user_id', award.userId);
        }
      } catch {
        /* best-effort */
      }
      insertedRows.push({ ...insertPayload });
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      month: { month_start_date: monthStartIso, month_end_date: monthEndIso },
      insertedCount: insertedRows.length,
      skippedCount: skippedRows.length,
      skipped: skippedRows,
      totalPointsAwarded,
      preview: insertedRows,
    });
  } catch (e: any) {
    console.error('[admin/monthly-certificates POST]', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to issue monthly certificates.' },
      { status: 500 }
    );
  }
}
