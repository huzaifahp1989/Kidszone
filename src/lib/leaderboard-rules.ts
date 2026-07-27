export const WEEKLY_DRAW_MIN_POINTS = 150;
export const MONTHLY_STAR_MIN_POINTS = 1000;
export const MAX_WEEKLY_STARS = 7;
export const QUARTERLY_DRAW_MIN_STARS = 10;
export const WEEKLY_STAR_DAY_THRESHOLDS = [0, 100, 150, 200, 250, 300, 350];

export function isEligibleForWeeklyDraw(weeklyPoints: number): boolean {
  return Number(weeklyPoints) > WEEKLY_DRAW_MIN_POINTS;
}

export function getWeeklyDrawPointsRemaining(weeklyPoints: number): number {
  return Math.max(0, WEEKLY_DRAW_MIN_POINTS + 1 - Number(weeklyPoints || 0));
}

export function getNextWeeklyStarTarget(weeklyPoints: number): number {
  return WEEKLY_STAR_DAY_THRESHOLDS.find(t => t > Number(weeklyPoints)) || WEEKLY_STAR_DAY_THRESHOLDS[WEEKLY_STAR_DAY_THRESHOLDS.length - 1];
}

export function getWeeklyStarsFromActiveDays(activeDays: number): number {
  if (activeDays < 1) return 0;
  if (activeDays < 3) return 1;
  if (activeDays < 5) return 2;
  if (activeDays < 7) return 3;
  return MAX_WEEKLY_STARS;
}

export function getMonthStartUtc(date?: Date): Date {
  const d = date ? new Date(date) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function getPreviousMonthStartUtc(date?: Date): Date {
  const d = date ? new Date(date) : new Date();
  const prevMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return prevMonth;
}

export function getQuarterKey(date?: Date): string {
  const d = date ? new Date(date) : new Date();
  const quarter = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}-Q${quarter}`;
}

export function getMonthKeysForQuarter(quarterKey: string): string[] {
  const [year, quarter] = quarterKey.split('-Q');
  const q = parseInt(quarter, 10);
  const startMonth = (q - 1) * 3;
  return Array.from({ length: 3 }, (_, i) => {
    const month = String(startMonth + i + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
}

export function isEligibleForMonthlyStar(monthlyPoints: number): boolean {
  return Number(monthlyPoints) >= 1000;
}

export function isEligibleForQuarterlyDraw(quarterlyStars: number): boolean {
  return quarterlyStars >= QUARTERLY_DRAW_MIN_STARS;
}

export function getQuarterlyDrawWeight(quarterlyStars: number): number {
  return Math.max(1, quarterlyStars - (QUARTERLY_DRAW_MIN_STARS - 1));
}
