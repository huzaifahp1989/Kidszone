/** Gregorian start/end for each Ramadan (update annually). */
export const RAMADAN_PERIODS = [
  { id: '1447', start: '2026-02-18', end: '2026-03-19' },
  { id: '1448', start: '2027-02-07', end: '2027-03-08' },
] as const;

export type RamadanPeriod = {
  id: string;
  start: string;
  end: string;
  isDemo?: boolean;
};

export type RamadanDayInfo = {
  dayNumber: number;
  totalDays: number;
  daysRemaining: number;
  inLastTenNights: boolean;
  isOddNight: boolean;
  laylatulQadrHighlight: boolean;
  nextLaylatOddNight: number | null;
  daysUntilNextLaylat: number | null;
};

export type RamadanBadgeId = 'ramadan-starter' | 'ramadan-star' | 'laylat-champion';

export const RAMADAN_BADGES: Record<
  RamadanBadgeId,
  { name: string; description: string; icon: string }
> = {
  'ramadan-starter': {
    name: 'Ramadan Starter',
    description: 'Stay active on 3 Ramadan days',
    icon: '🌙',
  },
  'ramadan-star': {
    name: 'Ramadan Star',
    description: 'Stay active on 7 Ramadan days',
    icon: '⭐',
  },
  'laylat-champion': {
    name: 'Laylatul Qadr Champion',
    description: 'Learn on an odd night in the last 10 nights',
    icon: '✨',
  },
};

export function isRamadanForceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_RAMADAN_MODE === 'force';
}

export function toDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(startKey: string, endKey: string): number {
  const start = Date.parse(`${startKey}T12:00:00.000Z`);
  const end = Date.parse(`${endKey}T12:00:00.000Z`);
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

export function getActiveRamadanPeriod(now = new Date()): RamadanPeriod | null {
  const today = toDateKey(now);

  if (isRamadanForceEnabled()) {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 14);
    const end = new Date(now);
    end.setUTCDate(end.getUTCDate() + 15);
    return {
      id: 'demo',
      start: toDateKey(start),
      end: toDateKey(end),
      isDemo: true,
    };
  }

  for (const period of RAMADAN_PERIODS) {
    if (today >= period.start && today <= period.end) {
      return { ...period, isDemo: false };
    }
  }

  return null;
}

/** Odd nights in the last 10 days of Ramadan are traditionally sought for Laylatul Qadr. */
export function getRamadanDayInfo(period: RamadanPeriod, todayKey = toDateKey()): RamadanDayInfo {
  const dayNumber = Math.max(1, daysBetween(period.start, todayKey) + 1);
  const totalDays = daysBetween(period.start, period.end) + 1;
  const daysRemaining = Math.max(0, daysBetween(todayKey, period.end));
  const inLastTenNights = dayNumber > totalDays - 10;
  const isOddNight = dayNumber % 2 === 1;

  let nextLaylatOddNight: number | null = null;
  let daysUntilNextLaylat: number | null = null;

  const lastTenStart = totalDays - 9;
  for (let night = lastTenStart; night <= totalDays; night += 1) {
    if (night % 2 === 1 && night >= dayNumber) {
      nextLaylatOddNight = night;
      daysUntilNextLaylat = night - dayNumber;
      break;
    }
  }

  const laylatulQadrHighlight = inLastTenNights && isOddNight;

  return {
    dayNumber,
    totalDays,
    daysRemaining,
    inLastTenNights,
    isOddNight,
    laylatulQadrHighlight,
    nextLaylatOddNight,
    daysUntilNextLaylat,
  };
}

export function isRamadanModeActive(now = new Date()): boolean {
  return getActiveRamadanPeriod(now) !== null;
}
