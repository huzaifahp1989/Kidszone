import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isTestModeEmail } from '@/lib/test-mode';
import {
  getAllScoreWeekActiveUserIds,
  getScoreWeekRangeUtc,
  getWeeklyScoresForUsers,
} from '@/lib/weekly-score';
import { getWeeklyActivityCountsForUsers } from '@/lib/weekly-activity';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import {
  chooseWeeklyCertificateAwardees,
  MIN_WEEKLY_CERTIFICATE_PARTICIPATION_ACTIVITY,
  MIN_WEEKLY_CERTIFICATE_PARTICIPATION_POINTS,
  type WeeklyCertificateCandidate,
  type WeeklyCertificateTier,
} from '@/lib/weekly-certificate-rules';

export const dynamic = 'force-dynamic';

const MIN_PARTICIPATION_POINTS = MIN_WEEKLY_CERTIFICATE_PARTICIPATION_POINTS;
const MIN_PARTICIPATION_ACTIVITY = MIN_WEEKLY_CERTIFICATE_PARTICIPATION_ACTIVITY;
const DEFAULT_GOLD = 1;
const DEFAULT_SILVER = 1;
const DEFAULT_BRONZE = 1;
const DEFAULT_PARTICIPATION_MAX = 100;

function isAdmin(request: Request) {
  return request.headers.get('x-admin-auth') === 'true';
}

function pointsForTier(tier: WeeklyCertificateTier): number {
  switch (tier) {
    case 'gold':
      return 50;
    case 'silver':
      return 30;
    case 'bronze':
      return 15;
    case 'participation':
      return 5;
  }
}

function parseCount(value: unknown, fallback: number): number {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

async function buildCandidates(weekStartIso: string, weekEndIso: string): Promise<WeeklyCertificateCandidate[]> {
  const activeUserIds = await getAllScoreWeekActiveUserIds(weekStartIso, weekEndIso);

  const candidates = new Map<string, WeeklyCertificateCandidate>();

  const { data: scoredRows, error: scoredError } = await supabaseAdmin
    .from('users_points')
    .select('user_id,weekly_points,badges,level')
    .gte('weekly_points', 0);

  if (scoredError) throw scoredError;

  for (const row of scoredRows || []) {
    const userId = String(row.user_id || '');
    if (!userId) continue;
    candidates.set(userId, {
      userId,
      name: '',
      weeklyPoints: Number(row.weekly_points) || 0,
      weeklyActivityCount: 0,
      weeklyScore: 0,
      badges: Number(row.badges) || 0,
      level: Number(row.level) || 1,
    });
  }

  for (const uid of activeUserIds) {
    if (!candidates.has(uid)) {
      candidates.set(uid, {
        userId: uid,
        name: '',
        weeklyPoints: 0,
        weeklyActivityCount: 0,
        weeklyScore: 0,
        badges: 0,
        level: 1,
      });
    }
  }

  const userIds = [...candidates.keys()];
  if (userIds.length === 0) return [];

  const [weeklyScoreByUser, weeklyActivityByUser, { data: authUsers }] = await Promise.all([
    getWeeklyScoresForUsers(userIds, weekStartIso, weekEndIso),
    getWeeklyActivityCountsForUsers(userIds, weekStartIso, weekEndIso),
    (async () => {
      try {
        return await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      } catch {
        return { data: { users: [] } as any, error: null } as any;
      }
    })(),
  ]);

  const metadataByUser = new Map<string, any>();
  for (const u of (authUsers as any)?.users || []) {
    const uid = String(u.id || '');
    if (uid) metadataByUser.set(uid, u.user_metadata || {});
  }

  const { data: profileRows } = await supabaseAdmin
    .from('users')
    .select('uid, name, age')
    .in('uid', userIds);

  const profileByUser = new Map<string, any>();
  for (const row of profileRows || []) {
    profileByUser.set(String((row as any).uid || ''), row);
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
    const weeklyScore = weeklyScoreByUser.get(userId) || 0;
    const activity = weeklyActivityByUser.get(userId) || { totalCount: 0 };
    cand.weeklyScore = weeklyScore;
    cand.weeklyActivityCount = Number(activity.totalCount) || 0;
    cand.name =
      String(profile.name || meta.name || '').trim() ||
      String(meta.full_name || meta.username || '').trim() ||
      'Young Scholar';
  }

  return [...candidates.values()];
}

export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const week = url.searchParams.get('week') || '';
  const mode = (url.searchParams.get('mode') || 'issued').toLowerCase();

  try {
    const { weekStartIso, weekEndIso } = getScoreWeekRangeUtc(
      week ? new Date(week) : new Date()
    );

    if (mode === 'history') {
      const { data, error } = await supabaseAdmin
        .from('weekly_certificates')
        .select('*')
        .order('week_start_date', { ascending: false })
        .order('rank', { ascending: true })
        .limit(500);

      if (error && String(error.code) !== '42P01') throw error;

      const byWeek = new Map<string, any[]>();
      for (const row of (data || []) as any[]) {
        const key = String(row.week_start_date);
        const list = byWeek.get(key) || [];
        list.push(row);
        byWeek.set(key, list);
      }

      return NextResponse.json({
        success: true,
        weeks: [...byWeek.entries()]
          .map(([w, list]) => ({ week_start_date: w, count: list.length, rows: list }))
          .sort((a, b) => (a.week_start_date < b.week_start_date ? 1 : -1)),
      });
    }

    if (mode === 'my') {
      // Exposed later via separate non-admin endpoint
      return NextResponse.json({ success: true, certificates: [] });
    }

    const candidates = await buildCandidates(weekStartIso, weekEndIso);
    const gold = parseCount(url.searchParams.get('gold'), DEFAULT_GOLD);
    const silver = parseCount(url.searchParams.get('silver'), DEFAULT_SILVER);
    const bronze = parseCount(url.searchParams.get('bronze'), DEFAULT_BRONZE);
    const participation = parseCount(url.searchParams.get('participation'), DEFAULT_PARTICIPATION_MAX);
    const awards = chooseWeeklyCertificateAwardees(candidates, {
      goldCount: gold,
      silverCount: silver,
      bronzeCount: bronze,
      participationMax: participation,
    });

    return NextResponse.json({
      success: true,
      week: { week_start_date: weekStartIso, week_end_date: weekEndIso },
      participation_thresholds: {
        min_points: MIN_PARTICIPATION_POINTS,
        min_activity: MIN_PARTICIPATION_ACTIVITY,
      },
      candidateCount: candidates.length,
      awards,
    });
  } catch (e: any) {
    console.error('[weekly-certificates GET]', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to load certificates.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const week = String(body?.week || '').trim() || undefined;
    const gold = parseCount(body?.goldCount, DEFAULT_GOLD);
    const silver = parseCount(body?.silverCount, DEFAULT_SILVER);
    const bronze = parseCount(body?.bronzeCount, DEFAULT_BRONZE);
    const participation = parseCount(body?.participationMax, DEFAULT_PARTICIPATION_MAX);
    const dryRun = body?.dryRun === false ? false : true;
    const issuedBy = String(body?.issuedBy || '').trim() || null;
    const { weekStartIso, weekEndIso } = getScoreWeekRangeUtc(
      week ? new Date(week) : new Date()
    );

    const candidates = await buildCandidates(weekStartIso, weekEndIso);
    const awards = chooseWeeklyCertificateAwardees(candidates, {
      goldCount: gold,
      silverCount: silver,
      bronzeCount: bronze,
      participationMax: participation,
    });

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        week: { week_start_date: weekStartIso, week_end_date: weekEndIso },
        issuedCount: 0,
        preview: awards.map((a) => ({
          userId: a.userId,
          name: a.name,
          rank: a.rank,
          tier: a.tier,
          weeklyPoints: a.weeklyPoints,
          weeklyActivityCount: a.weeklyActivityCount,
          weeklyScore: a.weeklyScore,
          points_to_award: pointsForTier(a.tier),
        })),
      });
    }

    const { data: existingRows, error: existingErr } = await supabaseAdmin
      .from('weekly_certificates')
      .select('user_id, tier, rank')
      .eq('week_start_date', weekStartIso);

    if (existingErr && String(existingErr.code) !== '42P01') throw existingErr;
    const existingByUser = new Map<string, { tier: string; rank: number }>();
    for (const row of (existingRows || []) as any[]) {
      existingByUser.set(String(row.user_id), {
        tier: String(row.tier),
        rank: Number(row.rank),
      });
    }

    const insertedRows: any[] = [];
    const skippedRows: any[] = [];
    let totalPointsAwarded = 0;

    for (const award of awards) {
      const existing = existingByUser.get(award.userId);
      if (existing) {
        skippedRows.push({ userId: award.userId, reason: 'already_issued', existing });
        continue;
      }
      const pointsAward = pointsForTier(award.tier);
      const { error: upsertErr } = await supabaseAdmin.from('weekly_certificates').insert({
        week_start_date: weekStartIso,
        user_id: award.userId,
        user_name: award.name || 'Young Scholar',
        rank: award.rank,
        tier: award.tier,
        weekly_points: award.weeklyPoints,
        weekly_activity_count: award.weeklyActivityCount,
        weekly_score: award.weeklyScore,
        badges_at_award: award.badges,
        level_at_award: award.level,
        issued_by: issuedBy,
      });
      if (upsertErr) throw upsertErr;
      try {
        const r = await awardPointsWithDailyCapByUserId(award.userId, pointsAward, {
          countTowardDailyLimit: true,
          successMessage: `Weekly certificate ${award.tier} award`,
        });
        if (r.success) totalPointsAwarded += Number(r.pointsAwarded) || 0;
      } catch (awardErr) {
        console.warn('[weekly-certificates] award points failed for', award.userId, awardErr);
      }
      try {
        // Increment badges count on users_points to reflect achievement (idempotent per award via unique (week,user) above).
        await supabaseAdmin
          .rpc('increment_user_badges_unsafe', { uid_input: award.userId, delta: 1 })
          .then((res: any) => {
            if (res?.error) {
              return supabaseAdmin
                .from('users_points')
                .update({ badges: (award.badges || 0) + 1 })
                .eq('user_id', award.userId);
            }
            return res;
          });
      } catch (badgeErr) {
        console.warn('[weekly-certificates] badges bump failed for', award.userId, badgeErr);
      }
      insertedRows.push({
        userId: award.userId,
        name: award.name,
        tier: award.tier,
        rank: award.rank,
        pointsAwarded: pointsAward,
      });
    }

    return NextResponse.json({
      success: true,
      week: { week_start_date: weekStartIso, week_end_date: weekEndIso },
      insertedCount: insertedRows.length,
      skippedCount: skippedRows.length,
      totalPointsAwarded,
      inserted: insertedRows,
      skipped: skippedRows,
    });
  } catch (e: any) {
    console.error('[weekly-certificates POST]', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to issue certificates.' },
      { status: 500 }
    );
  }
}
