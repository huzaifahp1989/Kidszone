export const TAWAF_LAPS = 7;
export const TAWAF_CHECKPOINTS_PER_LAP = 7;
export const TAWAF_CIRCLE_RADIANS = Math.PI * 2;
export const TAWAF_CHECKPOINT_RADIANS = TAWAF_CIRCLE_RADIANS / TAWAF_CHECKPOINTS_PER_LAP;
export const TAWAF_TOTAL_RADIANS = TAWAF_CIRCLE_RADIANS * TAWAF_LAPS;

export type TawafProgress = {
  radians: number;
  laps: number;
  checkpointsInLap: number;
  totalCheckpoints: number;
  complete: boolean;
};

export function getTawafProgress(radians: number): TawafProgress {
  const value = Number.isFinite(radians) ? radians : 0;
  const safeRadians = Math.max(0, Math.min(TAWAF_TOTAL_RADIANS, value));
  const totalCheckpoints = Math.min(
    TAWAF_LAPS * TAWAF_CHECKPOINTS_PER_LAP,
    Math.floor((safeRadians + Number.EPSILON) / TAWAF_CHECKPOINT_RADIANS)
  );
  const laps = Math.floor((safeRadians + Number.EPSILON) / TAWAF_CIRCLE_RADIANS);

  return {
    radians: safeRadians,
    laps: Math.min(TAWAF_LAPS, laps),
    checkpointsInLap:
      totalCheckpoints === TAWAF_LAPS * TAWAF_CHECKPOINTS_PER_LAP
        ? TAWAF_CHECKPOINTS_PER_LAP
        : totalCheckpoints % TAWAF_CHECKPOINTS_PER_LAP,
    totalCheckpoints,
    complete: safeRadians >= TAWAF_TOTAL_RADIANS,
  };
}
