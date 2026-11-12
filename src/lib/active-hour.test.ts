import { describe, expect, it } from 'vitest';
import { MIN_ACTIVE_HOUR_SAMPLES, hourToReminderTime, inferActiveHour } from '@/lib/active-hour';

const LONDON = 'Europe/London';

/** Build UTC ISO timestamps that land on the given London-local hours. */
function atLondonHours(hours: number[], dayOffset = 0): string[] {
  // October: London is UTC+1 (BST).
  return hours.map((hour) => {
    const utcHour = (hour - 1 + 24) % 24;
    const day = 10 + dayOffset + (hour === 0 ? 1 : 0);
    return `2026-10-${String(day).padStart(2, '0')}T${String(utcHour).padStart(2, '0')}:30:00.000Z`;
  });
}

describe('inferActiveHour', () => {
  it('returns the most common local hour', () => {
    const timestamps = [
      ...atLondonHours([17, 17, 17]),
      ...atLondonHours([9, 9]),
      ...atLondonHours([20]),
    ];
    expect(inferActiveHour(timestamps, LONDON)).toBe(17);
  });

  it('converts timestamps into the requested timezone', () => {
    // 23:30 UTC is 00:30 the next day in London (BST) → hour 0.
    expect(inferActiveHour(['2026-10-10T23:30:00.000Z', '2026-10-11T23:30:00.000Z', '2026-10-12T23:30:00.000Z'], LONDON)).toBe(0);
  });

  it('needs enough history before guessing', () => {
    const tooFew = atLondonHours([17, 17]);
    expect(tooFew).toHaveLength(MIN_ACTIVE_HOUR_SAMPLES - 1);
    expect(inferActiveHour(tooFew, LONDON)).toBeNull();
    expect(inferActiveHour([], LONDON)).toBeNull();
  });

  it('ignores blank and malformed timestamps', () => {
    const timestamps = [null, undefined, '', 'not-a-date', ...atLondonHours([16, 16, 16])];
    expect(inferActiveHour(timestamps, LONDON)).toBe(16);
  });

  it('returns null for an unusable timezone', () => {
    expect(inferActiveHour(atLondonHours([12, 12, 12]), 'Not/AZone')).toBeNull();
  });

  it('breaks ties towards the earliest hour', () => {
    const timestamps = [...atLondonHours([8, 8]), ...atLondonHours([13, 13]), ...atLondonHours([8])];
    expect(inferActiveHour(timestamps, LONDON)).toBe(8);
  });
});

describe('hourToReminderTime', () => {
  it('formats and clamps hours', () => {
    expect(hourToReminderTime(0)).toBe('00:00');
    expect(hourToReminderTime(9)).toBe('09:00');
    expect(hourToReminderTime(17.8)).toBe('17:00');
    expect(hourToReminderTime(-3)).toBe('00:00');
    expect(hourToReminderTime(99)).toBe('23:00');
  });
});
