export const WEEKLY_DRAW_MIN_POINTS = 150;

export function isEligibleForWeeklyDraw(weeklyPoints: number): boolean {
  return Number(weeklyPoints) > WEEKLY_DRAW_MIN_POINTS;
}

export function getWeeklyDrawPointsRemaining(weeklyPoints: number): number {
  return Math.max(0, WEEKLY_DRAW_MIN_POINTS + 1 - Number(weeklyPoints || 0));
}
