import { hadithsList } from '@/data/hadith';

export type DailyHadith = (typeof hadithsList)[number];

export const DAILY_HADITH_COUNT = 5;

/** UTC day key YYYY-MM-DD */
export function getUtcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Deterministic shuffle seeded by day so all users see the same 5 hadiths. */
function seededOrder(seed: number, length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  let s = seed >>> 0;
  for (let i = indices.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/**
 * Five hadiths for the day (UTC). Set rotates every day.
 * Over a week kids see different combinations as the pool is reshuffled daily.
 */
export function getHadithsForDay(date = new Date()): DailyHadith[] {
  if (!hadithsList.length) {
    throw new Error('No hadiths available');
  }

  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  const order = seededOrder(dayIndex + 7, hadithsList.length);
  const count = Math.min(DAILY_HADITH_COUNT, hadithsList.length);
  return order.slice(0, count).map((i) => hadithsList[i]);
}

/** @deprecated Prefer getHadithsForDay — kept for callers expecting a single item. */
export function getHadithOfTheDay(date = new Date()): DailyHadith {
  return getHadithsForDay(date)[0];
}

export function getHadithById(id: string): DailyHadith | undefined {
  return hadithsList.find((h) => h.id === id);
}

export function isHadithInTodaysSet(id: string, date = new Date()): boolean {
  return getHadithsForDay(date).some((h) => h.id === id);
}
