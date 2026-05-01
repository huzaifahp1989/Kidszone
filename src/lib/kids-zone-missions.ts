import { supabaseAdmin } from '@/lib/supabase-admin';

export type MissionKey = 'quiz' | 'game' | 'tracker' | 'points';

export type MissionDefinition = {
  key: MissionKey;
  title: string;
  description: string;
  href: string;
  icon: string;
  target: number;
  unit: string;
  accent: string;
};

export type MissionStatus = MissionDefinition & {
  progress: number;
  completed: boolean;
};

export type DailyMissionSnapshot = {
  date: string;
  missions: MissionStatus[];
  summary: {
    completedCount: number;
    totalCount: number;
    allCompleted: boolean;
  };
  reward: {
    points: number;
    configured: boolean;
    available: boolean;
    claimed: boolean;
    claimedAt: string | null;
    claimedPoints: number;
  };
};

export const MISSION_BONUS_POINTS = 10;

export const MISSION_DEFINITIONS: MissionDefinition[] = [
  {
    key: 'quiz',
    title: 'Quiz Champion',
    description: 'Complete today\'s quiz and keep your learning streak alive.',
    href: '/quiz',
    icon: '🧠',
    target: 1,
    unit: 'quiz',
    accent: 'teal',
  },
  {
    key: 'game',
    title: 'Game Explorer',
    description: 'Play one Islamic game to unlock today\'s play mission.',
    href: '/games',
    icon: '🎮',
    target: 1,
    unit: 'game',
    accent: 'amber',
  },
  {
    key: 'tracker',
    title: 'Good Habit Builder',
    description: 'Tick at least 3 daily deeds in your tracker.',
    href: '/tracker',
    icon: '📿',
    target: 3,
    unit: 'deeds',
    accent: 'rose',
  },
  {
    key: 'points',
    title: 'Point Sprint',
    description: 'Earn 20 points today across quiz, tracker, pledge, or games.',
    href: '/rewards',
    icon: '⭐',
    target: 20,
    unit: 'points',
    accent: 'violet',
  },
];

export function todayBounds() {
  const dateKey = new Date().toISOString().slice(0, 10);
  const startIso = `${dateKey}T00:00:00.000Z`;
  const endIso = `${dateKey}T23:59:59.999Z`;
  return { dateKey, startIso, endIso };
}

export async function getDailyMissionSnapshot(userId: string): Promise<DailyMissionSnapshot> {
  const { dateKey, startIso, endIso } = todayBounds();

  const [quizRes, gamesRes, pointsRes, trackerBaseRes, trackerRewardRes] = await Promise.all([
    supabaseAdmin
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('completed_at', startIso)
      .lte('completed_at', endIso),
    supabaseAdmin
      .from('game_activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('played_at', startIso)
      .lte('played_at', endIso),
    supabaseAdmin
      .from('users_points')
      .select('today_points')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('daily_progress')
      .select('completed_items, good_deed, daily_points')
      .eq('user_id', userId)
      .eq('date', dateKey)
      .maybeSingle(),
    supabaseAdmin
      .from('daily_progress')
      .select('mission_bonus_claimed_at, mission_bonus_points')
      .eq('user_id', userId)
      .eq('date', dateKey)
      .maybeSingle(),
  ]);

  if (quizRes.error) throw new Error(quizRes.error.message);
  if (gamesRes.error) throw new Error(gamesRes.error.message);
  if (pointsRes.error && pointsRes.error.code !== 'PGRST116') throw new Error(pointsRes.error.message);
  if (trackerBaseRes.error && trackerBaseRes.error.code !== 'PGRST116') throw new Error(trackerBaseRes.error.message);

  const trackerRewardColumnsConfigured = !trackerRewardRes.error || trackerRewardRes.error.code === 'PGRST116';
  const trackerProgress = Array.isArray(trackerBaseRes.data?.completed_items)
    ? trackerBaseRes.data.completed_items.length
    : 0;

  const missionProgress: Record<MissionKey, number> = {
    quiz: Number(quizRes.count || 0),
    game: Number(gamesRes.count || 0),
    tracker: trackerProgress,
    points: Number(pointsRes.data?.today_points || trackerBaseRes.data?.daily_points || 0),
  };

  const missions: MissionStatus[] = MISSION_DEFINITIONS.map((mission) => {
    const progress = Math.max(0, missionProgress[mission.key] || 0);
    return {
      ...mission,
      progress,
      completed: progress >= mission.target,
    };
  });

  const completedCount = missions.filter((mission) => mission.completed).length;
  const allCompleted = completedCount === missions.length;
  const claimedAt = trackerRewardColumnsConfigured ? trackerRewardRes.data?.mission_bonus_claimed_at ?? null : null;
  const claimedPoints = trackerRewardColumnsConfigured ? Number(trackerRewardRes.data?.mission_bonus_points || 0) : 0;
  const claimed = Boolean(claimedAt);

  return {
    date: dateKey,
    missions,
    summary: {
      completedCount,
      totalCount: missions.length,
      allCompleted,
    },
    reward: {
      points: MISSION_BONUS_POINTS,
      configured: trackerRewardColumnsConfigured,
      available: trackerRewardColumnsConfigured && allCompleted && !claimed,
      claimed,
      claimedAt,
      claimedPoints,
    },
  };
}