import { describe, expect, it } from 'vitest';
import { getScoreWeekRangeUtc, MAX_WEEKLY_SCORE } from '@/lib/weekly-score';

describe('getScoreWeekRangeUtc', () => {
  it('starts the score week on Saturday UK time', () => {
    expect(getScoreWeekRangeUtc(new Date('2026-06-27T12:00:00.000Z')).weekStartDate).toBe('2026-06-27');
    expect(getScoreWeekRangeUtc(new Date('2026-06-28T12:00:00.000Z')).weekStartDate).toBe('2026-06-27');
    expect(getScoreWeekRangeUtc(new Date('2026-07-03T22:59:00.000Z')).weekStartDate).toBe('2026-06-27');
  });

  it('rolls to the next Saturday after Friday night UK time', () => {
    expect(getScoreWeekRangeUtc(new Date('2026-07-04T00:00:00.000Z')).weekStartDate).toBe('2026-07-04');
  });

  it('resets at UK Saturday midnight even when UTC is still Friday', () => {
    expect(getScoreWeekRangeUtc(new Date('2026-06-26T23:30:00.000Z')).weekStartDate).toBe('2026-06-27');
  });
});

describe('MAX_WEEKLY_SCORE', () => {
  it('allows up to seven daily score marks (Sat-Fri)', () => {
    expect(MAX_WEEKLY_SCORE).toBe(7);
  });
});
