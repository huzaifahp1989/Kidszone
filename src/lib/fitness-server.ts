import type { FitnessChallenge, FitnessGoalType } from '@/lib/fitness';

export const FITNESS_CHALLENGES_TABLE = 'fitness_challenges';
export const DAILY_STEP_ACTIVITY_TABLE = 'daily_step_activity';
export const WALKING_REWARDS_TABLE = 'walking_rewards';
export const FITNESS_BADGES_TABLE = 'fitness_badges';
export const FITNESS_LEADERBOARD_TABLE = 'fitness_leaderboard';

export { isMissingTableError } from '@/lib/challenge-quiz-server';

/**
 * Server-authoritative "today" (UTC). Always use this instead of a client-provided
 * date so children cannot change their device clock to earn extra points.
 */
export function serverToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function mapChallenge(row: Record<string, unknown>): FitnessChallenge {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    description: row.description ? String(row.description) : '',
    goalType: (String(row.goal_type || 'steps') as FitnessGoalType),
    goalTarget: Number(row.goal_target ?? 0) || 0,
    points: Number(row.points ?? 0) || 0,
    ageGroup: String(row.age_group || 'All ages'),
    active: row.active == null ? true : Boolean(row.active),
    startDate: row.start_date ? String(row.start_date) : null,
    endDate: row.end_date ? String(row.end_date) : null,
  };
}

/** The currently active daily challenge (most recently created active one). */
export async function getActiveChallenge(): Promise<FitnessChallenge | null> {
  const { supabaseAdmin } = await import('@/lib/supabase-admin');
  const { data, error } = await supabaseAdmin
    .from(FITNESS_CHALLENGES_TABLE)
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapChallenge(data as Record<string, unknown>);
}

export interface FitnessStatus {
  challenge: FitnessChallenge | null;
  today: {
    steps: number;
    minutes: number;
    distanceM: number;
    calories: number;
    goalMet: boolean;
    pointsAwarded: number;
  };
  currentStreak: number;
  weekSteps: number;
  monthSteps: number;
  lifetimeSteps: number;
  totalPoints: number;
  badges: string[];
}

/** Read-only aggregate status for a child (today, streaks, lifetime, points, badges). */
export async function getFitnessStatus(userId: string): Promise<FitnessStatus | { tableMissing: true }> {
  const { supabaseAdmin } = await import('@/lib/supabase-admin');
  const { computeStreak } = await import('@/lib/fitness');
  const today = serverToday();

  const challenge = await getActiveChallenge();

  const { data: rows, error } = await supabaseAdmin
    .from(DAILY_STEP_ACTIVITY_TABLE)
    .select('activity_day, steps, minutes, distance_m, calories, goal_met, points_awarded')
    .eq('user_id', userId)
    .order('activity_day', { ascending: false })
    .limit(400);
  if (error) {
    if (isMissingTableErrorLocal(error)) return { tableMissing: true };
    throw error;
  }

  const activities = (rows || []) as Array<Record<string, unknown>>;
  const todayRow = activities.find((r) => String(r.activity_day) === today);
  const goalMetDays = activities.filter((r) => Boolean(r.goal_met)).map((r) => String(r.activity_day));

  const weekAgo = new Date(`${today}T00:00:00Z`);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  const weekStart = weekAgo.toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  let lifetimeSteps = 0;
  let totalPoints = 0;
  let weekSteps = 0;
  let monthSteps = 0;
  for (const r of activities) {
    const steps = Number(r.steps ?? 0);
    lifetimeSteps += steps;
    totalPoints += Number(r.points_awarded ?? 0);
    const day = String(r.activity_day);
    if (day >= weekStart) weekSteps += steps;
    if (day >= monthStart) monthSteps += steps;
  }

  const { data: badgeRows } = await supabaseAdmin
    .from(FITNESS_BADGES_TABLE)
    .select('badge_key')
    .eq('user_id', userId);
  const badges = (badgeRows || []).map((b) => String((b as Record<string, unknown>).badge_key));

  return {
    challenge,
    today: {
      steps: Number(todayRow?.steps ?? 0),
      minutes: Number(todayRow?.minutes ?? 0),
      distanceM: Number(todayRow?.distance_m ?? 0),
      calories: Number(todayRow?.calories ?? 0),
      goalMet: Boolean(todayRow?.goal_met),
      pointsAwarded: Number(todayRow?.points_awarded ?? 0),
    },
    currentStreak: computeStreak(goalMetDays, today),
    weekSteps,
    monthSteps,
    lifetimeSteps,
    totalPoints,
    badges,
  };
}

function isMissingTableErrorLocal(error: { code?: string } | null | undefined): boolean {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}
