/**
 * Work out the local hour a learner is most often active, so reminders can be
 * timed to when they actually use the app instead of a fixed clock time.
 */

export const MIN_ACTIVE_HOUR_SAMPLES = 3;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat | null {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, formatter);
    return formatter;
  } catch {
    return null;
  }
}

function localHour(formatter: Intl.DateTimeFormat, iso: string): number | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const digits = formatter.format(date).replace(/\D+/g, '');
  if (!digits) return null;
  const hour = Number(digits);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

/**
 * Most common local hour across the supplied activity timestamps.
 * Returns null when the timezone is unusable or there is not enough history.
 */
export function inferActiveHour(
  timestamps: Array<string | null | undefined>,
  timeZone: string
): number | null {
  const formatter = formatterFor(timeZone);
  if (!formatter) return null;

  const counts = new Array<number>(24).fill(0);
  let samples = 0;

  for (const timestamp of timestamps) {
    if (!timestamp) continue;
    const hour = localHour(formatter, String(timestamp));
    if (hour === null) continue;
    counts[hour] += 1;
    samples += 1;
  }

  if (samples < MIN_ACTIVE_HOUR_SAMPLES) return null;

  let bestHour = counts.findIndex((count) => count > 0);
  if (bestHour < 0) return null;
  for (let hour = bestHour + 1; hour < 24; hour += 1) {
    if (counts[hour] > counts[bestHour]) bestHour = hour;
  }

  return bestHour;
}

/** Format an hour as the HH:MM value the reminder scheduler expects. */
export function hourToReminderTime(hour: number): string {
  const clamped = Math.max(0, Math.min(23, Math.floor(hour)));
  return `${String(clamped).padStart(2, '0')}:00`;
}
