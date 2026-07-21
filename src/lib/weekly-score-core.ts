/** Score week: Saturday 00:00 UK time through Friday (resets Friday night / Saturday 00:00 UK). */
export const SCORE_WEEK_TIMEZONE = 'Europe/London';

export const MAX_WEEKLY_SCORE = 7;

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getZonedDateKey(date: Date, timeZone = SCORE_WEEK_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

export function getZonedWeekday(date: Date, timeZone = SCORE_WEEK_TIMEZONE): number {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  return WEEKDAY_MAP[weekday] ?? 0;
}

function getZonedHour(date: Date, timeZone = SCORE_WEEK_TIMEZONE): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    }).format(date)
  );
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function getZonedMidnightUtcIso(dateKey: string, timeZone = SCORE_WEEK_TIMEZONE): string {
  let utcMs = Date.parse(`${dateKey}T00:00:00.000Z`);

  for (let attempt = 0; attempt < 72; attempt += 1) {
    const candidate = new Date(utcMs);
    const candidateKey = getZonedDateKey(candidate, timeZone);

    if (candidateKey === dateKey && getZonedHour(candidate, timeZone) === 0) {
      return candidate.toISOString();
    }

    if (candidateKey < dateKey) {
      utcMs += 60 * 60 * 1000;
    } else if (candidateKey > dateKey) {
      utcMs -= 60 * 60 * 1000;
    } else {
      const hour = getZonedHour(candidate, timeZone);
      utcMs -= hour * 60 * 60 * 1000;
    }
  }

  return new Date(utcMs).toISOString();
}

export function getScoreWeekRangeUtc(date = new Date()) {
  const todayKey = getZonedDateKey(date);
  const daysSinceSaturday = (getZonedWeekday(date) + 1) % 7;
  const weekStartDate = addDaysToDateKey(todayKey, -daysSinceSaturday);
  const weekEndDate = addDaysToDateKey(weekStartDate, 7);

  return {
    weekStartIso: getZonedMidnightUtcIso(weekStartDate),
    weekEndIso: getZonedMidnightUtcIso(weekEndDate),
    weekStartDate,
    weekEndDate,
  };
}

/** The score week that ended immediately before the current one (Sat–Fri UK). */
export function getPreviousScoreWeekRangeUtc(date = new Date()) {
  const current = getScoreWeekRangeUtc(date);
  const weekStartDate = addDaysToDateKey(current.weekStartDate, -7);
  const weekEndDate = addDaysToDateKey(weekStartDate, 7);

  return {
    weekStartIso: getZonedMidnightUtcIso(weekStartDate),
    weekEndIso: getZonedMidnightUtcIso(weekEndDate),
    weekStartDate,
    weekEndDate,
  };
}
