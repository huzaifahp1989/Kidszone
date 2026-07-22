export type FitnessGoalType = 'steps' | 'minutes';

export interface FitnessChallenge {
  id: string;
  name: string;
  description: string;
  goalType: FitnessGoalType;
  goalTarget: number;
  points: number;
  ageGroup: string;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
}

/** Default daily walking goals seeded on setup. */
export const DEFAULT_FITNESS_CHALLENGES: Array<{
  name: string;
  goalType: FitnessGoalType;
  goalTarget: number;
  points: number;
}> = [
  { name: '20-minute walk', goalType: 'minutes', goalTarget: 20, points: 50 },
  { name: '30-minute walk', goalType: 'minutes', goalTarget: 30, points: 75 },
  { name: '5,000 steps', goalType: 'steps', goalTarget: 5000, points: 50 },
  { name: '7,500 steps', goalType: 'steps', goalTarget: 7500, points: 75 },
  { name: '10,000 steps', goalType: 'steps', goalTarget: 10000, points: 100 },
];

// ---- Anti-cheat / plausibility ----
/** A daily step count above this is implausible for a child and is clamped + flagged. */
export const MAX_DAILY_STEPS = 60000;
/** Above this we keep the steps but flag the day for review. */
export const SUSPICIOUS_DAILY_STEPS = 40000;
/** Native health sources we trust for real (non-manual) step data. */
export const TRUSTED_STEP_SOURCES = ['health_connect', 'healthkit', 'google_fit'];

// ---- Estimates ----
const METRES_PER_STEP = 0.66; // average child stride
const CALORIES_PER_STEP = 0.04;
const STEPS_PER_MINUTE = 100; // used only to estimate minutes when native minutes are absent

export function estimateDistanceMetres(steps: number): number {
  return Math.round(Math.max(0, steps) * METRES_PER_STEP);
}
export function estimateCalories(steps: number): number {
  return Math.round(Math.max(0, steps) * CALORIES_PER_STEP);
}
export function estimateMinutes(steps: number): number {
  return Math.round(Math.max(0, steps) / STEPS_PER_MINUTE);
}

export function isTrustedSource(source: string | null | undefined): boolean {
  return TRUSTED_STEP_SOURCES.includes(String(source || '').toLowerCase());
}

/** Whether a day's activity meets the given challenge goal. */
export function goalMet(challenge: Pick<FitnessChallenge, 'goalType' | 'goalTarget'>, activity: { steps: number; minutes: number }): boolean {
  if (challenge.goalType === 'minutes') return activity.minutes >= challenge.goalTarget;
  return activity.steps >= challenge.goalTarget;
}

// ---- Achievements ----
export interface FitnessAchievement {
  key: string;
  label: string;
  emoji: string;
  kind: 'lifetime_steps' | 'streak';
  threshold: number;
}

export const FITNESS_ACHIEVEMENTS: FitnessAchievement[] = [
  { key: 'first_walk', label: 'First Walk', emoji: '👟', kind: 'lifetime_steps', threshold: 1 },
  { key: 'streak_5', label: '5-Day Streak', emoji: '🔥', kind: 'streak', threshold: 5 },
  { key: 'streak_10', label: '10-Day Streak', emoji: '🔥', kind: 'streak', threshold: 10 },
  { key: 'streak_30', label: '30-Day Streak', emoji: '🏅', kind: 'streak', threshold: 30 },
  { key: 'lifetime_50k', label: '50,000 Lifetime Steps', emoji: '⭐', kind: 'lifetime_steps', threshold: 50000 },
  { key: 'lifetime_100k', label: '100,000 Lifetime Steps', emoji: '🌟', kind: 'lifetime_steps', threshold: 100000 },
  { key: 'lifetime_500k', label: '500,000 Lifetime Steps', emoji: '💫', kind: 'lifetime_steps', threshold: 500000 },
  { key: 'lifetime_1m', label: '1 Million Steps Champion', emoji: '🏆', kind: 'lifetime_steps', threshold: 1000000 },
];

/** Which achievement keys are earned given lifetime steps + best streak. */
export function earnedAchievementKeys(lifetimeSteps: number, bestStreak: number): string[] {
  return FITNESS_ACHIEVEMENTS.filter((a) =>
    a.kind === 'streak' ? bestStreak >= a.threshold : lifetimeSteps >= a.threshold
  ).map((a) => a.key);
}

/** Compute the current consecutive-day streak of goal-met days ending today/yesterday. */
export function computeStreak(goalMetDays: string[], todayIso: string): number {
  const set = new Set(goalMetDays);
  let streak = 0;
  const d = new Date(`${todayIso}T00:00:00Z`);
  // Allow the streak to count from today; if today not yet met, start from yesterday.
  if (!set.has(todayIso)) d.setUTCDate(d.getUTCDate() - 1);
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (set.has(key)) {
      streak += 1;
      d.setUTCDate(d.getUTCDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
