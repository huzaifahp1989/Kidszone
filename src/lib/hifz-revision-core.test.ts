import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RETENTION_DAYS,
  SPACED_INTERVALS_DAYS,
  addDays,
  computeDueItems,
  nextIntervalDays,
  planRevision,
  summariseSchedule,
  type HifzRevisionRow,
} from '@/lib/hifz-revision-core';

const NOW = new Date('2026-10-27T12:00:00.000Z');

function row(overrides: Partial<HifzRevisionRow> & { surah_number: number }): HifzRevisionRow {
  return {
    status: 'scheduled',
    interval_days: 1,
    streak: 0,
    last_reviewed_at: null,
    due_at: NOW.toISOString(),
    review_count: 0,
    ...overrides,
  };
}

describe('nextIntervalDays', () => {
  it('advances along the ladder on a successful revision', () => {
    expect(nextIntervalDays(0, true)).toBe(SPACED_INTERVALS_DAYS[0]);
    expect(nextIntervalDays(1, true)).toBe(SPACED_INTERVALS_DAYS[1]);
    expect(nextIntervalDays(2, true)).toBe(SPACED_INTERVALS_DAYS[2]);
    expect(nextIntervalDays(3, true)).toBe(SPACED_INTERVALS_DAYS[3]);
    expect(nextIntervalDays(4, true)).toBe(SPACED_INTERVALS_DAYS[4]);
    expect(nextIntervalDays(5, true)).toBe(SPACED_INTERVALS_DAYS[5]);
  });

  it('resets to the first interval on a failed revision', () => {
    expect(nextIntervalDays(0, false)).toBe(SPACED_INTERVALS_DAYS[0]);
    expect(nextIntervalDays(3, false)).toBe(SPACED_INTERVALS_DAYS[0]);
    expect(nextIntervalDays(99, false)).toBe(SPACED_INTERVALS_DAYS[0]);
  });

  it('caps at the longest interval for very long streaks', () => {
    const longest = SPACED_INTERVALS_DAYS[SPACED_INTERVALS_DAYS.length - 1];
    expect(nextIntervalDays(50, true)).toBe(longest);
    expect(nextIntervalDays(5, true)).toBe(longest);
  });
});

describe('computeDueItems', () => {
  it('keeps due rows, drops future ones, and orders by due date then surah number', () => {
    const items = computeDueItems(
      [
        row({ surah_number: 10, due_at: '2026-10-26T00:00:00.000Z' }),
        row({ surah_number: 5, due_at: '2026-10-25T00:00:00.000Z' }),
        row({ surah_number: 1, due_at: '2026-10-28T00:00:00.000Z' }),
        row({ surah_number: 7, due_at: '2026-10-25T00:00:00.000Z' }),
      ],
      NOW
    );
    expect(items.map((r) => r.surah_number)).toEqual([5, 7, 10]);
  });

  it('treats an explicit "due" status as due even when dated in the future', () => {
    const items = computeDueItems(
      [row({ surah_number: 2, status: 'due', due_at: '2026-12-01T00:00:00.000Z' })],
      NOW
    );
    expect(items).toHaveLength(1);
    expect(items[0].surah_number).toBe(2);
  });

  it('returns an empty queue when nothing is due', () => {
    expect(
      computeDueItems([row({ surah_number: 1, due_at: '2026-11-30T00:00:00.000Z' })], NOW)
    ).toEqual([]);
  });
});

describe('planRevision', () => {
  it('creates due-now items for new surahs and skips existing ones', () => {
    const plan = planRevision([row({ surah_number: 1 })], [1, 112, 113], NOW);
    expect(plan.map((p) => p.surah_number)).toEqual([112, 113]);
    expect(plan[0].status).toBe('due');
    expect(plan[0].interval_days).toBe(DEFAULT_RETENTION_DAYS);
    expect(plan[0].due_at).toBe(NOW.toISOString());
    expect(plan[0].streak).toBe(0);
  });

  it('de-duplicates the input surah numbers', () => {
    const plan = planRevision([], [112, 112, 113, 112], NOW);
    expect(plan.map((p) => p.surah_number)).toEqual([112, 113]);
  });
});

describe('summariseSchedule', () => {
  it('counts due, scheduled and completed-today rows', () => {
    const summary = summariseSchedule(
      [
        row({ surah_number: 1, due_at: addDays(NOW, 3) }),
        row({ surah_number: 2, due_at: addDays(NOW, -1) }),
        row({
          surah_number: 3,
          status: 'completed',
          last_reviewed_at: NOW.toISOString(),
          due_at: addDays(NOW, 5),
        }),
        row({ surah_number: 4, due_at: addDays(NOW, 1) }),
      ],
      NOW
    );
    expect(summary.dueCount).toBe(1);
    expect(summary.scheduledCount).toBe(3);
    expect(summary.completedToday).toBe(1);
    expect(summary.nextDueAt).toBe(addDays(NOW, 1));
  });

  it('reports an all-clear schedule', () => {
    const summary = summariseSchedule([], NOW);
    expect(summary).toEqual({ dueCount: 0, scheduledCount: 0, completedToday: 0, nextDueAt: null });
  });
});

describe('addDays', () => {
  it('adds whole calendar days to a timestamp', () => {
    expect(addDays(NOW, 1)).toBe('2026-10-28T12:00:00.000Z');
    expect(addDays(NOW, 60)).toBe('2026-12-26T12:00:00.000Z');
  });
});
