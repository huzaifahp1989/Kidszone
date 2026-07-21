import { supabaseAdmin } from '@/lib/supabase-admin';
import { getScoreWeekRangeUtc } from '@/lib/weekly-score-core';

export type WeeklyThemeKey = 'salah' | 'durood' | 'quiz' | 'games';

export type WeeklyChallengeTheme = {
  key: WeeklyThemeKey;
  title: string;
  description: string;
  href: string;
  icon: string;
  target: number;
  unit: string;
  badgeName: string;
};

export const WEEKLY_CHALLENGE_THEMES: WeeklyChallengeTheme[] = [
  {
    key: 'salah',
    title: 'Week of Salah',
    description: 'Log your salah 5 times this week to earn the Salah Star badge.',
    href: '/salah',
    icon: '🕌',
    target: 5,
    unit: 'logs',
    badgeName: 'Salah Star',
  },
  {
    key: 'durood',
    title: 'Week of Durood',
    description: 'Log durood or zikr 5 times this week to earn the Durood Champion badge.',
    href: '/pledge',
    icon: '📿',
    target: 5,
    unit: 'logs',
    badgeName: 'Durood Champion',
  },
  {
    key: 'quiz',
    title: 'Week of Quiz',
    description: 'Complete 5 quizzes this week to earn the Quiz Explorer badge.',
    href: '/quiz',
    icon: '🧠',
    target: 5,
    unit: 'quizzes',
    badgeName: 'Quiz Explorer',
  },
  {
    key: 'games',
    title: 'Week of Games',
    description: 'Play 5 games this week to earn the Game Master badge.',
    href: '/games',
    icon: '🎮',
    target: 5,
    unit: 'games',
    badgeName: 'Game Master',
  },
];

const THEME_EPOCH = new Date('2026-01-04T00:00:00.000Z');

export function getCurrentWeeklyTheme(date = new Date()): WeeklyChallengeTheme {
  const week = getScoreWeekRangeUtc(date);
  const weekStartMs = Date.parse(`${week.weekStartDate}T12:00:00.000Z`);
  const epochMs = THEME_EPOCH.getTime();
  const weeksSinceEpoch = Math.max(0, Math.floor((weekStartMs - epochMs) / (7 * 24 * 60 * 60 * 1000)));
  const index = weeksSinceEpoch % WEEKLY_CHALLENGE_THEMES.length;
  return WEEKLY_CHALLENGE_THEMES[index];
}

async function countProgress(
  userId: string,
  themeKey: WeeklyThemeKey,
  weekStartIso: string,
  weekEndIso: string
): Promise<number> {
  switch (themeKey) {
    case 'salah': {
      const { count, error } = await supabaseAdmin
        .from('salah_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', weekStartIso)
        .lt('created_at', weekEndIso);
      if (error && error.code !== '42P01') throw error;
      return Number(count ?? 0);
    }
    case 'durood': {
      const { count, error } = await supabaseAdmin
        .from('pledges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', weekStartIso)
        .lt('created_at', weekEndIso);
      if (error) throw error;
      return Number(count ?? 0);
    }
    case 'quiz': {
      const { count, error } = await supabaseAdmin
        .from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('completed_at', weekStartIso)
        .lt('completed_at', weekEndIso);
      if (error) throw error;
      return Number(count ?? 0);
    }
    case 'games': {
      const { count, error } = await supabaseAdmin
        .from('game_progress')
        .select('id', { count: 'exact', head: true })
        .eq('uid', userId)
        .gte('playedat', weekStartIso)
        .lt('playedat', weekEndIso);
      if (error) throw error;
      return Number(count ?? 0);
    }
    default:
      return 0;
  }
}

export type WeeklyChallengeSnapshot = {
  weekStartDate: string;
  weekEndDate: string;
  theme: WeeklyChallengeTheme;
  progress: number;
  target: number;
  completed: boolean;
  badgeEarned: boolean;
  badgeName: string;
};

export async function getWeeklyChallengeSnapshot(userId: string): Promise<WeeklyChallengeSnapshot> {
  const week = getScoreWeekRangeUtc();
  const theme = getCurrentWeeklyTheme();

  const progress = await countProgress(userId, theme.key, week.weekStartIso, week.weekEndIso);
  const completed = progress >= theme.target;

  let badgeEarned = completed;
  try {
    if (completed) {
      await supabaseAdmin.from('user_weekly_challenge_badges').upsert(
        {
          user_id: userId,
          week_start_date: week.weekStartDate,
          theme_key: theme.key,
        },
        { onConflict: 'user_id,week_start_date,theme_key' }
      );
    } else {
      const { data } = await supabaseAdmin
        .from('user_weekly_challenge_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('week_start_date', week.weekStartDate)
        .eq('theme_key', theme.key)
        .maybeSingle();
      badgeEarned = Boolean(data);
    }
  } catch {
    badgeEarned = completed;
  }

  return {
    weekStartDate: week.weekStartDate,
    weekEndDate: week.weekEndDate,
    theme,
    progress: Math.min(progress, theme.target),
    target: theme.target,
    completed,
    badgeEarned,
    badgeName: theme.badgeName,
  };
}
