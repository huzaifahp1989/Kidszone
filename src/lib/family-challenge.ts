import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeFamilyEmail } from '@/lib/family-accounts';
import { getScoreWeekRangeUtc } from '@/lib/weekly-score-core';
import { unlockStickersForTriggers } from '@/lib/stickers-server';

const FAMILY_CHALLENGE_TARGET = 100;

async function resolveFamilyEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('family_email, email')
    .eq('uid', userId)
    .maybeSingle();

  const familyEmail = normalizeFamilyEmail(
    String((data as { family_email?: string; email?: string } | null)?.family_email || '')
  );
  if (familyEmail) return familyEmail;

  return normalizeFamilyEmail(String((data as { email?: string } | null)?.email || '')) || null;
}

export type FamilyChallengeSnapshot = {
  familyEmail: string;
  weekKey: string;
  targetPoints: number;
  progressPoints: number;
  completed: boolean;
  percent: number;
};

export async function getFamilyChallengeForUser(userId: string): Promise<FamilyChallengeSnapshot | null> {
  const familyEmail = await resolveFamilyEmail(userId);
  if (!familyEmail) return null;

  const week = getScoreWeekRangeUtc();
  const weekKey = `week-${week.weekStartDate}`;

  try {
    const { data, error } = await supabaseAdmin
      .from('kids_zone_family_challenges')
      .select('week_key, target_points, progress_points, completed_at')
      .eq('family_email', familyEmail)
      .maybeSingle();

    if (error && error.code === '42P01') {
      return {
        familyEmail,
        weekKey,
        targetPoints: FAMILY_CHALLENGE_TARGET,
        progressPoints: 0,
        completed: false,
        percent: 0,
      };
    }

    if (!data || data.week_key !== weekKey) {
      return {
        familyEmail,
        weekKey,
        targetPoints: FAMILY_CHALLENGE_TARGET,
        progressPoints: 0,
        completed: false,
        percent: 0,
      };
    }

    const progress = Number(data.progress_points || 0);
    const target = Number(data.target_points || FAMILY_CHALLENGE_TARGET);
    return {
      familyEmail,
      weekKey,
      targetPoints: target,
      progressPoints: progress,
      completed: Boolean(data.completed_at) || progress >= target,
      percent: Math.min(100, Math.round((progress / Math.max(1, target)) * 100)),
    };
  } catch {
    return {
      familyEmail,
      weekKey,
      targetPoints: FAMILY_CHALLENGE_TARGET,
      progressPoints: 0,
      completed: false,
      percent: 0,
    };
  }
}

/** Add points toward this week's family challenge (call when kid earns points). */
export async function addFamilyChallengeProgress(userId: string, points: number) {
  if (!points || points <= 0) return null;
  const familyEmail = await resolveFamilyEmail(userId);
  if (!familyEmail) return null;

  const week = getScoreWeekRangeUtc();
  const weekKey = `week-${week.weekStartDate}`;
  const current = await getFamilyChallengeForUser(userId);
  const baseProgress = current?.weekKey === weekKey ? current.progressPoints : 0;
  const nextProgress = baseProgress + points;
  const completed = nextProgress >= FAMILY_CHALLENGE_TARGET;

  const { error } = await supabaseAdmin.from('kids_zone_family_challenges').upsert(
    {
      family_email: familyEmail,
      week_key: weekKey,
      target_points: FAMILY_CHALLENGE_TARGET,
      progress_points: nextProgress,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'family_email' }
  );

  if (error) {
    if (error.code === '42P01') return null;
    throw error;
  }

  if (completed && !(current?.completed)) {
    await unlockStickersForTriggers(userId, ['family_challenge']);
  }

  return getFamilyChallengeForUser(userId);
}
