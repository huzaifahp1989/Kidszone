import { supabaseAdmin } from '@/lib/supabase-admin';
import { getScoreWeekRangeUtc } from '@/lib/weekly-score-core';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { isTestModeUserId } from '@/lib/test-mode-server';

export const MYSTERY_BOX_REQUIRED_DAYS = 7;

const BADGE_NAMES = [
  'Steady Star',
  'Daily Spark',
  'Week Warrior',
  'Comeback Champ',
  'Faithful Learner',
];

function dayKeyFromIso(iso: string): string {
  return String(iso).slice(0, 10);
}

async function collectActiveDayKeys(userId: string, startIso: string, endIso: string): Promise<Set<string>> {
  const days = new Set<string>();

  const [quizRes, gameRes, pledgeRes] = await Promise.all([
    supabaseAdmin
      .from('quiz_attempts')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', startIso)
      .lt('completed_at', endIso),
    supabaseAdmin
      .from('game_progress')
      .select('playedat')
      .eq('uid', userId)
      .gte('playedat', startIso)
      .lt('playedat', endIso),
    supabaseAdmin
      .from('pledges')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lt('created_at', endIso),
  ]);

  for (const row of quizRes.data || []) {
    if (row.completed_at) days.add(dayKeyFromIso(String(row.completed_at)));
  }
  for (const row of gameRes.data || []) {
    if (row.playedat) days.add(dayKeyFromIso(String(row.playedat)));
  }
  for (const row of pledgeRes.data || []) {
    if (row.created_at) days.add(dayKeyFromIso(String(row.created_at)));
  }

  return days;
}

export type MysteryBoxSnapshot = {
  activeDays: number;
  requiredDays: number;
  unlockKey: string;
  unlocked: boolean;
  claimed: boolean;
  claim?: {
    pointsAwarded: number;
    badgeName: string;
    claimedAt: string;
  } | null;
};

export async function getMysteryBoxSnapshot(userId: string): Promise<MysteryBoxSnapshot> {
  const week = getScoreWeekRangeUtc();
  const unlockKey = `week-${week.weekStartDate}`;
  const activeDaysSet = await collectActiveDayKeys(userId, week.weekStartIso, week.weekEndIso);
  const activeDays = activeDaysSet.size;
  const unlocked = activeDays >= MYSTERY_BOX_REQUIRED_DAYS;

  let claim: MysteryBoxSnapshot['claim'] = null;
  try {
    const { data, error } = await supabaseAdmin
      .from('mystery_box_claims')
      .select('points_awarded, badge_name, claimed_at')
      .eq('user_id', userId)
      .eq('unlock_key', unlockKey)
      .maybeSingle();

    if (!error && data) {
      claim = {
        pointsAwarded: Number(data.points_awarded ?? 0),
        badgeName: String(data.badge_name || 'Steady Star'),
        claimedAt: String(data.claimed_at),
      };
    }
  } catch {
    /* table may not exist yet */
  }

  return {
    activeDays,
    requiredDays: MYSTERY_BOX_REQUIRED_DAYS,
    unlockKey,
    unlocked,
    claimed: Boolean(claim),
    claim,
  };
}

export async function claimMysteryBox(userId: string): Promise<{
  ok: boolean;
  message: string;
  pointsAwarded: number;
  badgeName?: string;
  snapshot: MysteryBoxSnapshot;
  profile?: {
    points: number;
    weeklyPoints: number;
    monthlyPoints: number;
    todayPoints: number;
  };
}> {
  const snapshot = await getMysteryBoxSnapshot(userId);

  if (snapshot.claimed && snapshot.claim) {
    return {
      ok: true,
      message: `You already opened this week’s box: ${snapshot.claim.badgeName} (+${snapshot.claim.pointsAwarded}).`,
      pointsAwarded: 0,
      badgeName: snapshot.claim.badgeName,
      snapshot,
    };
  }

  if (!snapshot.unlocked) {
    return {
      ok: false,
      message: `Keep learning! ${snapshot.requiredDays - snapshot.activeDays} more active day(s) to unlock the mystery box.`,
      pointsAwarded: 0,
      snapshot,
    };
  }

  if (await isTestModeUserId(userId)) {
    return {
      ok: true,
      message: 'Test mode: mystery box tracked but no points added.',
      pointsAwarded: 0,
      badgeName: 'Steady Star',
      snapshot: { ...snapshot, claimed: true },
    };
  }

  const points = 15 + Math.floor(Math.random() * 16); // 15–30
  const badgeName = BADGE_NAMES[Math.floor(Math.random() * BADGE_NAMES.length)];

  const { error: insertError } = await supabaseAdmin.from('mystery_box_claims').insert({
    user_id: userId,
    unlock_key: snapshot.unlockKey,
    points_awarded: points,
    badge_name: badgeName,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      const refreshed = await getMysteryBoxSnapshot(userId);
      return {
        ok: true,
        message: 'Already claimed this week.',
        pointsAwarded: 0,
        badgeName: refreshed.claim?.badgeName,
        snapshot: refreshed,
      };
    }
    throw insertError;
  }

  const award = await awardPointsWithDailyCapByUserId(userId, points, {
    countTowardDailyLimit: true,
    successMessage: `Mystery box! +${points} points and badge “${badgeName}”.`,
  });

  const refreshed = await getMysteryBoxSnapshot(userId);

  return {
    ok: true,
    message: award.message,
    pointsAwarded: award.pointsAwarded,
    badgeName,
    snapshot: refreshed,
    profile: {
      points: award.totalPoints ?? 0,
      weeklyPoints: award.weeklyPoints ?? 0,
      monthlyPoints: award.monthlyPoints ?? 0,
      todayPoints: award.todayPoints ?? 0,
    },
  };
}
