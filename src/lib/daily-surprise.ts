import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { isTestModeUserId } from '@/lib/test-mode-server';
import { unlockStickersForTriggers } from '@/lib/stickers-server';
import { getUtcTodayKey } from '@/lib/points-policy';

export const DAILY_SURPRISE_POINTS = 5;

const TIP_POOL = [
  { href: '/games/memory-match', label: 'Try Memory Match' },
  { href: '/create/coloring', label: 'Colour something beautiful' },
  { href: '/quiz', label: 'Take today’s quiz' },
  { href: '/create/dua', label: 'Say the dua of the day' },
  { href: '/games', label: 'Play an Islamic game' },
];

export type DailySurpriseSnapshot = {
  date: string;
  available: boolean;
  claimed: boolean;
  claim: {
    rewardType: string;
    pointsAwarded: number;
    stickerId: string | null;
    tipHref: string | null;
    tipLabel: string | null;
  } | null;
};

export async function getDailySurpriseSnapshot(userId: string): Promise<DailySurpriseSnapshot> {
  const date = getUtcTodayKey();
  try {
    const { data, error } = await supabaseAdmin
      .from('kids_zone_daily_surprise')
      .select('reward_type, points_awarded, sticker_id, tip_href, tip_label')
      .eq('user_id', userId)
      .eq('claim_date', date)
      .maybeSingle();

    if (error && error.code === '42P01') {
      return { date, available: true, claimed: false, claim: null };
    }

    if (data) {
      return {
        date,
        available: false,
        claimed: true,
        claim: {
          rewardType: String(data.reward_type),
          pointsAwarded: Number(data.points_awarded || 0),
          stickerId: data.sticker_id ? String(data.sticker_id) : null,
          tipHref: data.tip_href ? String(data.tip_href) : null,
          tipLabel: data.tip_label ? String(data.tip_label) : null,
        },
      };
    }
  } catch {
    /* table may not exist */
  }

  return { date, available: true, claimed: false, claim: null };
}

export async function claimDailySurprise(userId: string) {
  const snapshot = await getDailySurpriseSnapshot(userId);
  if (snapshot.claimed && snapshot.claim) {
    return {
      ok: true,
      message: 'You already opened today’s surprise box!',
      pointsAwarded: 0,
      snapshot,
    };
  }

  const roll = Math.random();
  let rewardType: 'points' | 'sticker' | 'tip' = 'points';
  if (roll > 0.66) rewardType = 'sticker';
  else if (roll > 0.33) rewardType = 'tip';

  let pointsAwarded = 0;
  let stickerId: string | null = null;
  let tipHref: string | null = null;
  let tipLabel: string | null = null;
  let message = '';

  if (rewardType === 'points') {
    pointsAwarded = DAILY_SURPRISE_POINTS;
    if (!(await isTestModeUserId(userId))) {
      const award = await awardPointsWithDailyCapByUserId(userId, DAILY_SURPRISE_POINTS, {
        countTowardDailyLimit: true,
        successMessage: `Daily surprise! +${DAILY_SURPRISE_POINTS} points.`,
      });
      pointsAwarded = award.pointsAwarded;
    }
    message = `Surprise! +${pointsAwarded} points. Come back tomorrow for another box!`;
  } else if (rewardType === 'sticker') {
    const unlocked = await unlockStickersForTriggers(userId, ['daily_surprise']);
    stickerId = unlocked.newlyUnlockedIds[0] || 'surprise_star';
    message =
      unlocked.newlyUnlockedIds.length > 0
        ? 'Surprise! You unlocked a sticker — check your Sticker Book!'
        : 'Surprise! You already have the surprise sticker — come back tomorrow!';
  } else {
    const tip = TIP_POOL[Math.floor(Math.random() * TIP_POOL.length)];
    tipHref = tip.href;
    tipLabel = tip.label;
    message = `Surprise mission: ${tip.label}! Come back tomorrow for another box.`;
  }

  const { error } = await supabaseAdmin.from('kids_zone_daily_surprise').insert({
    user_id: userId,
    claim_date: snapshot.date,
    reward_type: rewardType,
    points_awarded: pointsAwarded,
    sticker_id: stickerId,
    tip_href: tipHref,
    tip_label: tipLabel,
  });

  if (error) {
    if (error.code === '23505') {
      const refreshed = await getDailySurpriseSnapshot(userId);
      return { ok: true, message: 'Already claimed today.', pointsAwarded: 0, snapshot: refreshed };
    }
    if (error.code === '42P01') {
      return {
        ok: false,
        message: 'Surprise box not set up yet. Run ADD_KIDS_ZONE_ENGAGEMENT.sql',
        pointsAwarded: 0,
        snapshot,
      };
    }
    throw error;
  }

  const refreshed = await getDailySurpriseSnapshot(userId);
  return { ok: true, message, pointsAwarded, snapshot: refreshed, rewardType, tipHref, tipLabel, stickerId };
}
