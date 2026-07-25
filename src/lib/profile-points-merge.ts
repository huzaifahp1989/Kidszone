import { POINTS_DAILY_CAP } from '@/lib/points-policy';

export type PointsProfileSlice = {
  points?: number;
  weeklyPoints?: number;
  monthlyPoints?: number;
  todayPoints?: number;
};

function finite(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}

/** Avoid stale API reads wiping a fresh award; allow UTC day reset at daily cap. */
export function mergeTodayPoints(prevToday: number, apiToday: number): number {
  const prev = finite(prevToday);
  const api = finite(apiToday);
  if (api >= prev) return api;
  if (prev >= POINTS_DAILY_CAP) return api;
  return prev;
}

/**
 * Merge server totals with local profile after an award.
 * Uses the higher of server vs local, and applies an optimistic delta when the
 * server profile is missing but points were awarded.
 */
export function mergePointsAfterAward(
  prev: PointsProfileSlice | null | undefined,
  awarded: number,
  server?: PointsProfileSlice | null
): Required<PointsProfileSlice> {
  const base = {
    points: finite(prev?.points),
    weeklyPoints: finite(prev?.weeklyPoints),
    monthlyPoints: finite(prev?.monthlyPoints),
    todayPoints: finite(prev?.todayPoints),
  };

  const delta = finite(awarded);
  const optimistic = {
    points: base.points + delta,
    weeklyPoints: base.weeklyPoints + delta,
    monthlyPoints: base.monthlyPoints + delta,
    todayPoints: base.todayPoints + delta,
  };

  if (!server || !Number.isFinite(Number(server.points))) {
    return delta > 0 ? optimistic : base;
  }

  return {
    points: Math.max(finite(server.points), optimistic.points, base.points),
    weeklyPoints: Math.max(
      finite(server.weeklyPoints),
      optimistic.weeklyPoints,
      base.weeklyPoints
    ),
    monthlyPoints: Math.max(
      finite(server.monthlyPoints),
      optimistic.monthlyPoints,
      base.monthlyPoints
    ),
    todayPoints: mergeTodayPoints(
      Math.max(optimistic.todayPoints, base.todayPoints),
      finite(server.todayPoints)
    ),
  };
}
