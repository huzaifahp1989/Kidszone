import { describe, expect, it } from 'vitest';
import {
  getTawafProgress,
  TAWAF_CHECKPOINT_RADIANS,
  TAWAF_CIRCLE_RADIANS,
  TAWAF_TOTAL_RADIANS,
} from '@/lib/virtual-hajj-gameplay';

describe('Tawaf route progress', () => {
  it('tracks ordered checkpoints and lap boundaries', () => {
    expect(getTawafProgress(TAWAF_CHECKPOINT_RADIANS)).toMatchObject({
      laps: 0,
      checkpointsInLap: 1,
      totalCheckpoints: 1,
      complete: false,
    });
    expect(getTawafProgress(TAWAF_CIRCLE_RADIANS)).toMatchObject({
      laps: 1,
      checkpointsInLap: 0,
      totalCheckpoints: 7,
      complete: false,
    });
  });

  it('clamps progress to the seven-lap finish and never reports extra checkpoints', () => {
    expect(getTawafProgress(TAWAF_TOTAL_RADIANS * 2)).toMatchObject({
      radians: TAWAF_TOTAL_RADIANS,
      laps: 7,
      checkpointsInLap: 7,
      totalCheckpoints: 49,
      complete: true,
    });
  });

  it('treats negative, non-finite and missing values as zero', () => {
    expect(getTawafProgress(-1).totalCheckpoints).toBe(0);
    expect(getTawafProgress(Number.NaN).radians).toBe(0);
    expect(getTawafProgress(Number.POSITIVE_INFINITY).totalCheckpoints).toBe(0);
  });
});
