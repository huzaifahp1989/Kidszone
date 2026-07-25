import { supabaseAdmin } from '@/lib/supabase-admin';

export type MissionKey = 'quiz' | 'game' | 'create' | 'points';

export type MissionDefinition = {
  key: MissionKey;
  title: string;
  description: string;
  href: string;
  icon: string;
  target: number;
  unit: string;
  accent: string;
  /** game_progress marker gameid when key is create */
  createMarker?: string;
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

const CREATE_MISSION_ROTATION: Array<{
  title: string;
  description: string;
  href: string;
  icon: string;
  marker: string;
}> = [
  {
    title: 'Colour Creator',
    description: 'Finish a colouring, draw, or create art activity today.',
    href: '/create/coloring',
    icon: '🎨',
    marker: 'activity-creative',
  },
  {
    title: 'Story Adventurer',
    description: 'Complete today’s story adventure with kind choices.',
    href: '/create/story',
    icon: '📖',
    marker: 'activity-story-choice',
  },
  {
    title: 'Dua Buddy',
    description: 'Say the dua of the day and claim your points.',
    href: '/create/dua',
    icon: '🤲',
    marker: 'activity-dua',
  },
  {
    title: 'Kindness Hero',
    description: 'Finish the kindness hunt checklist today.',
    href: '/create/kindness',
    icon: '💛',
    marker: 'activity-kindness',
  },
  {
    title: 'Manners Star',
    description: 'Tick off today’s good manners practice.',
    href: '/create/manners',
    icon: '✨',
    marker: 'activity-manners',
  },
];

export function getCreateMissionForDate(dateKey: string): (typeof CREATE_MISSION_ROTATION)[number] {
  const dayIndex = Math.floor(new Date(`${dateKey}T12:00:00.000Z`).getTime() / 86_400_000);
  const idx = ((dayIndex % CREATE_MISSION_ROTATION.length) + CREATE_MISSION_ROTATION.length) % CREATE_MISSION_ROTATION.length;
  return CREATE_MISSION_ROTATION[idx];
}

export function buildMissionDefinitions(dateKey: string): MissionDefinition[] {
  const create = getCreateMissionForDate(dateKey);
  return [
    {
      key: 'quiz',
      title: 'Quiz Champion',
      description: "Complete today's quiz and keep your learning streak alive.",
      href: '/quiz',
      icon: '🧠',
      target: 1,
      unit: 'quiz',
      accent: 'teal',
    },
    {
      key: 'game',
      title: 'Game Explorer',
      description: "Play one Islamic game to unlock today's play mission.",
      href: '/games',
      icon: '🎮',
      target: 1,
      unit: 'game',
      accent: 'amber',
    },
    {
      key: 'create',
      title: create.title,
      description: create.description,
      href: create.href,
      icon: create.icon,
      target: 1,
      unit: 'create',
      accent: 'rose',
      createMarker: create.marker,
    },
    {
      key: 'points',
      title: 'Point Sprint',
      description: 'Earn 20 points today across quiz, create, pledge, or games.',
      href: '/rewards',
      icon: '⭐',
      target: 20,
      unit: 'points',
      accent: 'violet',
    },
  ];
}

/** @deprecated Use buildMissionDefinitions(dateKey) — kept for static imports. */
export const MISSION_DEFINITIONS: MissionDefinition[] = buildMissionDefinitions(
  new Date().toISOString().slice(0, 10)
);

export function todayBounds() {
  const dateKey = new Date().toISOString().slice(0, 10);
  const startIso = `${dateKey}T00:00:00.000Z`;
  const endIso = `${dateKey}T23:59:59.999Z`;
  return { dateKey, startIso, endIso };
}

export async function getDailyMissionSnapshot(userId: string): Promise<DailyMissionSnapshot> {
  const { dateKey, startIso, endIso } = todayBounds();
  const definitions = buildMissionDefinitions(dateKey);
  const createMission = definitions.find((m) => m.key === 'create');
  const createMarker = createMission?.createMarker || 'activity-creative';

  const [quizRes, gamesRes, createRes, pointsRes, trackerBaseRes, trackerRewardRes] = await Promise.all([
    supabaseAdmin
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('completed_at', startIso)
      .lte('completed_at', endIso),
    supabaseAdmin
      .from('game_progress')
      .select('id', { count: 'exact', head: true })
      .eq('uid', userId)
      .gte('playedat', startIso)
      .lte('playedat', endIso)
      .not('gameid', 'like', 'activity-%'),
    supabaseAdmin
      .from('game_progress')
      .select('id', { count: 'exact', head: true })
      .eq('uid', userId)
      .eq('gameid', createMarker)
      .gte('playedat', startIso)
      .lte('playedat', endIso),
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
  if (createRes.error) throw new Error(createRes.error.message);
  if (pointsRes.error && pointsRes.error.code !== 'PGRST116') throw new Error(pointsRes.error.message);
  if (trackerBaseRes.error && trackerBaseRes.error.code !== 'PGRST116') throw new Error(trackerBaseRes.error.message);

  const trackerRewardColumnsConfigured = !trackerRewardRes.error || trackerRewardRes.error.code === 'PGRST116';

  const missionProgress: Record<MissionKey, number> = {
    quiz: Number(quizRes.count || 0),
    game: Number(gamesRes.count || 0),
    create: Number(createRes.count || 0),
    points: Number(pointsRes.data?.today_points || trackerBaseRes.data?.daily_points || 0),
  };

  const missions: MissionStatus[] = definitions.map((mission) => {
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
