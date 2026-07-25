export type PointsProfileSnapshot = {
  points?: number;
  weeklyPoints?: number;
  monthlyPoints?: number;
  todayPoints?: number;
  badges?: number;
  level?: string | number;
};

export const POINTS_PROFILE_UPDATE_EVENT = 'iklp:points-updated';

/** Broadcast updated point totals so AuthProvider can refresh the UI immediately. */
export function dispatchPointsProfileUpdate(snapshot: PointsProfileSnapshot) {
  if (typeof window === 'undefined') return;
  if (!snapshot || typeof snapshot !== 'object') return;
  window.dispatchEvent(new CustomEvent(POINTS_PROFILE_UPDATE_EVENT, { detail: snapshot }));
}

export function normalizePointsProfileSnapshot(
  raw: Record<string, unknown> | null | undefined
): PointsProfileSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;

  const points = Number(raw.points ?? raw.total_points ?? raw.totalPoints);
  const weeklyPoints = Number(raw.weeklyPoints ?? raw.weekly_points);
  const monthlyPoints = Number(raw.monthlyPoints ?? raw.monthly_points);
  const todayPoints = Number(raw.todayPoints ?? raw.today_points);
  const badges = Number(raw.badges);

  const snapshot: PointsProfileSnapshot = {};
  if (Number.isFinite(points)) snapshot.points = points;
  if (Number.isFinite(weeklyPoints)) snapshot.weeklyPoints = weeklyPoints;
  if (Number.isFinite(monthlyPoints)) snapshot.monthlyPoints = monthlyPoints;
  if (Number.isFinite(todayPoints)) snapshot.todayPoints = todayPoints;
  if (Number.isFinite(badges)) snapshot.badges = badges;
  if (raw.level != null && raw.level !== '') snapshot.level = raw.level as string | number;

  return Object.keys(snapshot).length > 0 ? snapshot : null;
}
