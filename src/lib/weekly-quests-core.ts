/**
 * Pure logic for the weekly quest board: five quests that reset every score
 * week (Saturday 00:00 UK → Friday) plus an end-of-week chest.
 *
 * Deliberately free of DB/network access so it can be unit tested directly.
 */

import { addDaysToDateKey, diffDays } from '@/lib/date-keys';

export type QuestKey =
  | 'active_days'
  | 'quiz_sprint'
  | 'game_explorer'
  | 'salah_keeper'
  | 'good_deeds';

export type QuestDefinition = {
  key: QuestKey;
  title: string;
  description: string;
  href: string;
  icon: string;
  target: number;
  unit: string;
  points: number;
};

export const WEEKLY_QUESTS: QuestDefinition[] = [
  {
    key: 'active_days',
    title: 'Show Up Daily',
    description: 'Be active on 4 different days this week.',
    href: '/activities-menu',
    icon: '📅',
    target: 4,
    unit: 'days',
    points: 30,
  },
  {
    key: 'quiz_sprint',
    title: 'Quiz Sprint',
    description: 'Finish 5 quizzes this week.',
    href: '/quiz',
    icon: '🧠',
    target: 5,
    unit: 'quizzes',
    points: 25,
  },
  {
    key: 'game_explorer',
    title: 'Game Explorer',
    description: 'Play 4 Islamic games this week.',
    href: '/games',
    icon: '🎮',
    target: 4,
    unit: 'games',
    points: 20,
  },
  {
    key: 'salah_keeper',
    title: 'Salah Keeper',
    description: 'Log your salah on 5 days this week.',
    href: '/salah',
    icon: '🕌',
    target: 5,
    unit: 'days',
    points: 25,
  },
  {
    key: 'good_deeds',
    title: 'Good Deeds',
    description: 'Tick 10 good deeds this week.',
    href: '/tracker',
    icon: '📿',
    target: 10,
    unit: 'deeds',
    points: 20,
  },
];

export const WEEKLY_CHEST_POINTS = 50;
export const WEEKLY_CHEST_BADGE = 'Weekly Quest Champion';
export const WEEKLY_CHEST_MIN_QUESTS = WEEKLY_QUESTS.length;

export const QUEST_KEYS: QuestKey[] = WEEKLY_QUESTS.map((quest) => quest.key);

export function isQuestKey(value: unknown): value is QuestKey {
  return typeof value === 'string' && (QUEST_KEYS as string[]).includes(value);
}

export function questDefinition(key: QuestKey): QuestDefinition {
  const found = WEEKLY_QUESTS.find((quest) => quest.key === key);
  if (!found) throw new Error(`Unknown weekly quest: ${key}`);
  return found;
}

export type QuestStatus = QuestDefinition & {
  progress: number;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
};

export type WeeklyQuestBoard = {
  weekStartDate: string;
  weekEndDate: string;
  daysRemaining: number;
  quests: QuestStatus[];
  claimedKeys: QuestKey[];
  summary: {
    completedCount: number;
    claimedCount: number;
    totalCount: number;
    totalPointsAvailable: number;
    allCompleted: boolean;
    allClaimed: boolean;
  };
  chest: {
    points: number;
    badgeName: string;
    unlocked: boolean;
    claimed: boolean;
    claimedAt: string | null;
  };
};

export type WeeklyQuestBoardInput = {
  todayKey: string;
  weekStartDate: string;
  weekEndDate: string;
  progress: Partial<Record<QuestKey, number>>;
  claimedKeys?: string[];
  chestClaimedAt?: string | null;
};

export function buildWeeklyQuestBoard(input: WeeklyQuestBoardInput): WeeklyQuestBoard {
  const claimedSet = new Set((input.claimedKeys || []).filter(isQuestKey));

  const quests: QuestStatus[] = WEEKLY_QUESTS.map((quest) => {
    const progress = Math.max(0, Math.floor(Number(input.progress[quest.key] ?? 0)));
    const completed = progress >= quest.target;
    const claimed = claimedSet.has(quest.key);
    return {
      ...quest,
      progress,
      completed,
      claimed,
      claimable: completed && !claimed,
    };
  });

  const completedCount = quests.filter((q) => q.completed).length;
  const claimedCount = quests.filter((q) => q.claimed).length;
  const allCompleted = completedCount === quests.length;
  const allClaimed = claimedCount === quests.length;

  const lastDayKey = addDaysToDateKey(input.weekEndDate, -1);
  const daysRemaining = Math.max(0, diffDays(input.todayKey, lastDayKey) + 1);

  return {
    weekStartDate: input.weekStartDate,
    weekEndDate: input.weekEndDate,
    daysRemaining,
    quests,
    claimedKeys: quests.filter((q) => q.claimed).map((q) => q.key),
    summary: {
      completedCount,
      claimedCount,
      totalCount: quests.length,
      totalPointsAvailable: quests.reduce((sum, q) => sum + q.points, 0) + WEEKLY_CHEST_POINTS,
      allCompleted,
      allClaimed,
    },
    chest: {
      points: WEEKLY_CHEST_POINTS,
      badgeName: WEEKLY_CHEST_BADGE,
      unlocked: allCompleted,
      claimed: Boolean(input.chestClaimedAt),
      claimedAt: input.chestClaimedAt ?? null,
    },
  };
}
