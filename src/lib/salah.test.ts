import { describe, expect, it } from 'vitest';
import { computeSalahStats, buildCalendarGrid, SALAH_PRAYERS } from '@/lib/salah';
import type { SalahEntry } from '@/types/salah';

describe('salah utils', () => {
  it('buildCalendarGrid returns a full week-aligned grid', () => {
    const month = new Date('2026-05-15T00:00:00.000Z');
    const grid = buildCalendarGrid(month, 1);
    expect(grid.days.length % 7).toBe(0);
    expect(grid.days.length).toBeGreaterThanOrEqual(28);
    expect(grid.gridStart <= grid.monthStart).toBe(true);
    expect(grid.gridEnd >= grid.monthEnd).toBe(true);
  });

  it('computeSalahStats counts completed/missed/unlogged against total slots', () => {
    const entries: SalahEntry[] = [
      {
        id: '1',
        userId: 'u',
        date: '2026-05-01',
        prayer: 'fajr',
        status: 'completed',
        prayedAt: '2026-05-01T04:30:00.000Z',
        notes: null,
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
      {
        id: '2',
        userId: 'u',
        date: '2026-05-01',
        prayer: 'dhuhr',
        status: 'missed',
        prayedAt: null,
        notes: null,
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
      {
        id: '3',
        userId: 'u',
        date: '2026-05-02',
        prayer: 'isha',
        status: 'completed',
        prayedAt: '2026-05-02T20:30:00.000Z',
        notes: null,
        createdAt: '2026-05-02T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
    ];

    const stats = computeSalahStats(entries, new Date('2026-05-01T00:00:00.000Z'), new Date('2026-05-02T00:00:00.000Z'));
    expect(stats.totalSlots).toBe(2 * SALAH_PRAYERS.length);
    expect(stats.completed).toBe(2);
    expect(stats.missed).toBe(1);
    expect(stats.unlogged).toBe(stats.totalSlots - 3);
    expect(stats.completionRate).toBeCloseTo(2 / stats.totalSlots);
  });
});

