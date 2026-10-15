function getZonedParts(date: Date, timeZone: string): {
  dateKey: string;
  minuteOfDay: number;
} | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const hour = Number(values.hour);
    const minute = Number(values.minute);
    if (!values.year || !values.month || !values.day || !Number.isInteger(hour) || !Number.isInteger(minute)) {
      return null;
    }

    return {
      dateKey: `${values.year}-${values.month}-${values.day}`,
      minuteOfDay: hour * 60 + minute,
    };
  } catch {
    return null;
  }
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  return getZonedParts(new Date(), timeZone) !== null;
}

export function getLocalDateKey(date: Date, timeZone: string): string | null {
  return getZonedParts(date, timeZone)?.dateKey ?? null;
}

export function isUserReminderDue(input: {
  now: Date;
  time: string;
  timeZone: string;
  lastSentAt?: string | null;
  deliveryWindowMinutes?: number;
}): boolean {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(input.time);
  if (!match || !Number.isFinite(input.now.getTime())) return false;

  const current = getZonedParts(input.now, input.timeZone);
  if (!current) return false;

  const targetMinutes = Number(match[1]) * 60 + Number(match[2]);
  const elapsedMinutes = (current.minuteOfDay - targetMinutes + 1440) % 1440;
  const deliveryWindow = input.deliveryWindowMinutes ?? 5;
  if (elapsedMinutes > deliveryWindow) return false;

  const occurrence = new Date(input.now.getTime() - elapsedMinutes * 60_000);
  const occurrenceDateKey = getLocalDateKey(occurrence, input.timeZone);
  if (!occurrenceDateKey) return false;

  if (input.lastSentAt) {
    const lastSentDate = new Date(input.lastSentAt);
    const lastSentDateKey = getLocalDateKey(lastSentDate, input.timeZone);
    if (lastSentDateKey === occurrenceDateKey) return false;
  }

  return true;
}
