import { describe, expect, it } from 'vitest';
import { isUserReminderDue } from '@/lib/user-reminder-schedule';

describe('isUserReminderDue', () => {
  it('matches a reminder in the user timezone rather than UTC', () => {
    expect(
      isUserReminderDue({
        now: new Date('2026-01-15T16:00:00.000Z'),
        time: '16:00',
        timeZone: 'Europe/London',
      })
    ).toBe(true);
    expect(
      isUserReminderDue({
        now: new Date('2026-01-15T16:00:00.000Z'),
        time: '16:00',
        timeZone: 'America/New_York',
      })
    ).toBe(false);
  });

  it('handles the five-minute cron window and avoids duplicates on the same local day', () => {
    const now = new Date('2026-01-15T16:04:00.000Z');
    expect(
      isUserReminderDue({
        now,
        time: '16:00',
        timeZone: 'Europe/London',
        deliveryWindowMinutes: 5,
      })
    ).toBe(true);
    expect(
      isUserReminderDue({
        now,
        time: '16:00',
        timeZone: 'Europe/London',
        lastSentAt: '2026-01-15T16:01:00.000Z',
      })
    ).toBe(false);
  });

  it('handles a delivery window that crosses local midnight', () => {
    expect(
      isUserReminderDue({
        now: new Date('2026-01-16T00:02:00.000Z'),
        time: '00:00',
        timeZone: 'Europe/London',
        lastSentAt: '2026-01-15T00:00:00.000Z',
      })
    ).toBe(true);
  });

  it('rejects invalid times and time zones', () => {
    expect(
      isUserReminderDue({
        now: new Date('2026-01-15T16:00:00.000Z'),
        time: '25:00',
        timeZone: 'Europe/London',
      })
    ).toBe(false);
    expect(
      isUserReminderDue({
        now: new Date('2026-01-15T16:00:00.000Z'),
        time: '16:00',
        timeZone: 'invalid/timezone',
      })
    ).toBe(false);
  });
});
