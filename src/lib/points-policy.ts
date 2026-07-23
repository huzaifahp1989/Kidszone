export const POINTS_DAILY_CAP = 200;

export const QUIZ_POINTS_PER_COMPLETION = 25;

export const ACTIVITY_BONUS_POINTS = 25;

/** Points awarded when a recording is approved by admin. */
export const RECORDING_APPROVED_POINTS = 25;

export const MAX_DAILY_QUIZ_ATTEMPTS = 2;

export const MAX_DAILY_GAME_COMPLETIONS = 2;

export const MAX_DAILY_DUROOD = 1;

export const MAX_DAILY_ZIKR = 1;

export const MAX_DAILY_HADITH = 1;

export const MAX_DAILY_ARABIC = 1;

export const MAX_DAILY_SALAH = 1;

export const MAX_DAILY_STORY_QUIZ = 1;

export const MAX_DAILY_CREATIVE = 1;

export const MAX_DAILY_STORY_CHOICE = 1;

export const MAX_DAILY_DUA = 1;

export const MAX_DAILY_KINDNESS = 1;

export const MAX_DAILY_MANNERS = 1;

/** Max quiz points per day: 2 quizzes × 25 pts */
export const MAX_DAILY_QUIZ_POINTS = QUIZ_POINTS_PER_COMPLETION * MAX_DAILY_QUIZ_ATTEMPTS;

export const MAX_DAILY_GAME_POINTS = ACTIVITY_BONUS_POINTS * MAX_DAILY_GAME_COMPLETIONS;

export type DailyEarnActivity =
  | 'quiz'
  | 'game'
  | 'durood'
  | 'zikr'
  | 'hadith'
  | 'arabic'
  | 'salah'
  | 'story_quiz'
  | 'creative'
  | 'story_choice'
  | 'dua'
  | 'kindness'
  | 'manners';

export const DAILY_EARNING_PLAN: Array<{
  activity: DailyEarnActivity;
  title: string;
  limit: number;
  pointsEach: number;
  href: string;
}> = [
  { activity: 'quiz', title: 'Daily Quiz', limit: MAX_DAILY_QUIZ_ATTEMPTS, pointsEach: QUIZ_POINTS_PER_COMPLETION, href: '/quiz' },
  { activity: 'game', title: 'Islamic Games', limit: MAX_DAILY_GAME_COMPLETIONS, pointsEach: ACTIVITY_BONUS_POINTS, href: '/games' },
  { activity: 'story_quiz', title: 'Story Mini-Quiz', limit: MAX_DAILY_STORY_QUIZ, pointsEach: ACTIVITY_BONUS_POINTS, href: '/stories' },
  { activity: 'durood', title: 'Durood Pledge', limit: MAX_DAILY_DUROOD, pointsEach: ACTIVITY_BONUS_POINTS, href: '/pledge' },
  { activity: 'zikr', title: 'Zikr Pledge', limit: MAX_DAILY_ZIKR, pointsEach: ACTIVITY_BONUS_POINTS, href: '/pledge' },
  { activity: 'hadith', title: 'Daily Hadith', limit: MAX_DAILY_HADITH, pointsEach: ACTIVITY_BONUS_POINTS, href: '/hadith' },
  { activity: 'salah', title: 'Salah Tracking', limit: MAX_DAILY_SALAH, pointsEach: ACTIVITY_BONUS_POINTS, href: '/salah' },
  { activity: 'creative', title: 'Create & Play', limit: MAX_DAILY_CREATIVE, pointsEach: ACTIVITY_BONUS_POINTS, href: '/create' },
  { activity: 'story_choice', title: 'Story Adventure', limit: MAX_DAILY_STORY_CHOICE, pointsEach: ACTIVITY_BONUS_POINTS, href: '/create/story' },
  { activity: 'dua', title: 'Dua of the Day', limit: MAX_DAILY_DUA, pointsEach: ACTIVITY_BONUS_POINTS, href: '/create/dua' },
  { activity: 'kindness', title: 'Kindness Hunt', limit: MAX_DAILY_KINDNESS, pointsEach: ACTIVITY_BONUS_POINTS, href: '/create/kindness' },
  { activity: 'manners', title: 'Good Manners', limit: MAX_DAILY_MANNERS, pointsEach: ACTIVITY_BONUS_POINTS, href: '/create/manners' },
];

/** Plan rows can sum above the daily cap — kids pick a mix up to POINTS_DAILY_CAP. */
export const DAILY_PLAN_TOTAL_POINTS = DAILY_EARNING_PLAN.reduce(
  (sum, row) => sum + row.limit * row.pointsEach,
  0
);

export function getActivityDailyLimit(activity: DailyEarnActivity): number {
  switch (activity) {
    case 'quiz':
      return MAX_DAILY_QUIZ_ATTEMPTS;
    case 'game':
      return MAX_DAILY_GAME_COMPLETIONS;
    case 'durood':
      return MAX_DAILY_DUROOD;
    case 'zikr':
      return MAX_DAILY_ZIKR;
    case 'hadith':
      return MAX_DAILY_HADITH;
    case 'arabic':
      return MAX_DAILY_ARABIC;
    case 'salah':
      return MAX_DAILY_SALAH;
    case 'story_quiz':
      return MAX_DAILY_STORY_QUIZ;
    case 'creative':
      return MAX_DAILY_CREATIVE;
    case 'story_choice':
      return MAX_DAILY_STORY_CHOICE;
    case 'dua':
      return MAX_DAILY_DUA;
    case 'kindness':
      return MAX_DAILY_KINDNESS;
    case 'manners':
      return MAX_DAILY_MANNERS;
    default:
      return 0;
  }
}

/** UTC calendar day key (YYYY-MM-DD). */
export function getUtcTodayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Today's points for display/cap checks.
 * Resets to 0 when last_earned_date is not today (UTC).
 */
export function resolveTodayPoints(
  todayPointsRaw: unknown,
  lastEarnedDate: string | null | undefined,
  now = new Date()
): number {
  const todayStr = getUtcTodayKey(now);
  const lastEarned = String(lastEarnedDate || '').trim().slice(0, 10);
  if (!lastEarned || lastEarned !== todayStr) return 0;
  const n = Number(todayPointsRaw ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.min(POINTS_DAILY_CAP, n)) : 0;
}

/**
 * Resolve how many points to award after applying the daily cap only.
 * Weekly/monthly/total counters are not capped here — only today's earning limit.
 */
export function resolvePointsToAward(
  requestedPoints: number,
  currentTodayPoints = 0,
  countTowardDailyLimit = true
): number {
  const amount = Number(requestedPoints);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  if (!countTowardDailyLimit) {
    return amount;
  }

  return Math.max(0, Math.min(amount, POINTS_DAILY_CAP - currentTodayPoints));
}
