import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import {
  ACTIVITY_BONUS_POINTS,
  DailyEarnActivity,
  QUIZ_POINTS_PER_COMPLETION,
} from '@/lib/points-policy';
import { canEarnActivityPoints, hasLoggedAllSalahToday } from '@/lib/daily-activity-limits';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { isTestModeUserId } from '@/lib/test-mode-server';

export type DailyActivityAwardResult = {
  success: boolean;
  pointsAwarded: number;
  message: string;
  reason?: 'awarded' | 'activity_limit' | 'daily_limit_reached' | 'test_mode' | 'validation_failed' | 'update_failed';
  used?: number;
  limit?: number;
  totalPoints?: number;
  weeklyPoints?: number;
  monthlyPoints?: number;
  todayPoints?: number;
};

async function recordActivityMarker(userId: string, activity: DailyEarnActivity, pointsAwarded: number) {
  const markerActivities: DailyEarnActivity[] = [
    'hadith',
    'salah',
    'story_quiz',
    'arabic',
    'creative',
    'story_choice',
    'dua',
    'kindness',
    'manners',
  ];
  if (!markerActivities.includes(activity)) return;

  const gameId =
    activity === 'story_quiz'
      ? 'activity-story-quiz'
      : activity === 'story_choice'
        ? 'activity-story-choice'
        : `activity-${activity}`;

  await supabaseAdmin.from('game_progress').insert({
    uid: userId,
    gameid: gameId,
    points: pointsAwarded,
    playedat: new Date().toISOString(),
  });
}

export async function tryAwardDailyActivity(
  userId: string,
  activity: DailyEarnActivity,
  options?: {
    successMessage?: string;
    skipActivityLimit?: boolean;
    salahDateKey?: string;
  }
): Promise<DailyActivityAwardResult> {
  const pointsRequested = activity === 'quiz' ? QUIZ_POINTS_PER_COMPLETION : ACTIVITY_BONUS_POINTS;

  if (await isTestModeUserId(userId)) {
    return {
      success: true,
      pointsAwarded: 0,
      message: 'Test mode active. Activity tracked but no leaderboard points were added.',
      reason: 'test_mode',
    };
  }

  const ensured = await ensureUserRecords(userId);
  if (!ensured.ok) {
    return {
      success: false,
      pointsAwarded: 0,
      message: ensured.error || 'Could not prepare user profile.',
      reason: 'update_failed',
    };
  }

  if (activity === 'salah') {
    const dateKey = options?.salahDateKey || new Date().toISOString().slice(0, 10);
    const complete = await hasLoggedAllSalahToday(userId, dateKey);
    if (!complete) {
      return {
        success: false,
        pointsAwarded: 0,
        message: 'Log all 5 daily prayers to earn +25 points.',
        reason: 'validation_failed',
      };
    }
  }

  if (!options?.skipActivityLimit) {
    const gate = await canEarnActivityPoints(userId, activity);
    if (!gate.allowed) {
      return {
        success: true,
        pointsAwarded: 0,
        message: gate.message || 'Daily limit reached for this activity.',
        reason: 'activity_limit',
        used: gate.used,
        limit: gate.limit,
      };
    }
  }

  const award = await awardPointsWithDailyCapByUserId(userId, pointsRequested, {
    countTowardDailyLimit: true,
    successMessage:
      options?.successMessage ||
      `+${pointsRequested} points added for ${activity.replace(/_/g, ' ')}.`,
  });

  if (
    award.pointsAwarded > 0 &&
    (
      activity === 'hadith' ||
      activity === 'salah' ||
      activity === 'story_quiz' ||
      activity === 'arabic' ||
      activity === 'creative' ||
      activity === 'story_choice' ||
      activity === 'dua' ||
      activity === 'kindness' ||
      activity === 'manners'
    )
  ) {
    await recordActivityMarker(userId, activity, award.pointsAwarded);
  }

  if (award.pointsAwarded > 0) {
    try {
      const { unlockStickersForTriggers } = await import('@/lib/stickers-server');
      const triggers: string[] = [];
      if (activity === 'quiz') triggers.push('quiz_complete');
      if (activity === 'game') triggers.push('game_complete');
      if (activity === 'creative') triggers.push('create_creative', 'create_any');
      if (activity === 'story_choice') triggers.push('create_story_choice', 'create_any');
      if (activity === 'dua') triggers.push('create_dua', 'create_any');
      if (activity === 'kindness') triggers.push('create_kindness', 'create_any');
      if (activity === 'manners') triggers.push('create_manners', 'create_any');
      if (triggers.length) await unlockStickersForTriggers(userId, triggers);
    } catch {
      /* optional */
    }
  }

  return {
    success: award.success,
    pointsAwarded: award.pointsAwarded,
    message: award.message,
    reason:
      award.pointsAwarded > 0
        ? 'awarded'
        : award.reason === 'daily_limit_reached'
          ? 'daily_limit_reached'
          : award.reason === 'update_failed'
            ? 'update_failed'
            : 'daily_limit_reached',
    totalPoints: award.totalPoints,
    weeklyPoints: award.weeklyPoints,
    monthlyPoints: award.monthlyPoints,
    todayPoints: award.todayPoints,
  };
}
