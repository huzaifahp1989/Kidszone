import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  ACTIVITY_BONUS_POINTS,
  DailyEarnActivity,
  getActivityDailyLimit,
  MAX_DAILY_QUIZ_ATTEMPTS,
} from '@/lib/points-policy';
import { SALAH_PRAYERS } from '@/lib/salah';

export function getUtcDayBounds(date = new Date()) {
  const dayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  return {
    dayStartIso: dayStart.toISOString(),
    dayEndIso: dayEnd.toISOString(),
    dayKey: dayStart.toISOString().slice(0, 10),
  };
}

/** Game rows that actually earned daily points (excludes hadith/salah markers and 0-point plays). */
export function isGameEarningSessionRow(row: {
  gameid?: string | null;
  points?: number | null;
}): boolean {
  return (
    !String(row.gameid || '').startsWith('activity-') &&
    Number(row.points ?? 0) > 0
  );
}

export function countGameEarningSessions(
  rows: Array<{ gameid?: string | null; points?: number | null }>
): number {
  return rows.filter(isGameEarningSessionRow).length;
}

function activityLimitMessage(activity: DailyEarnActivity, limit: number): string {
  const labels: Record<DailyEarnActivity, string> = {
    quiz: 'quizzes',
    game: 'games',
    durood: 'Durood pledges',
    zikr: 'Zikr pledges',
    hadith: 'Hadith sessions',
    arabic: 'Arabic learning',
    salah: 'Salah check-ins',
    story_quiz: 'story quizzes',
    creative: 'creative activities',
    story_choice: 'story adventures',
    dua: 'Dua of the Day',
    kindness: 'kindness hunts',
    manners: 'good manners checklists',
  };
  const noun = labels[activity];
  if (limit === 1) {
    return `You have already earned today's ${ACTIVITY_BONUS_POINTS} points for ${noun.replace(/s$/, '')}. Come back tomorrow!`;
  }
  return `You have already earned points for ${limit} ${noun} today. Come back tomorrow for more!`;
}

export async function countActivityCompletionsToday(
  userId: string,
  activity: DailyEarnActivity
): Promise<number> {
  const { dayStartIso, dayEndIso } = getUtcDayBounds();

  switch (activity) {
    case 'quiz': {
      const { count, error } = await supabaseAdmin
        .from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('completed_at', dayStartIso)
        .lt('completed_at', dayEndIso);
      if (error) throw error;
      return Number(count ?? 0);
    }
    case 'game': {
      const { data, error } = await supabaseAdmin
        .from('game_progress')
        .select('gameid, points')
        .eq('uid', userId)
        .gte('playedat', dayStartIso)
        .lt('playedat', dayEndIso);
      if (error) throw error;
      return countGameEarningSessions(data || []);
    }
    case 'durood': {
      const { count, error } = await supabaseAdmin
        .from('pledges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', 'durood')
        .gte('count', 5)
        .gte('created_at', dayStartIso)
        .lt('created_at', dayEndIso);
      if (error) {
        if (error.code === '42P01') return 0;
        throw error;
      }
      return Number(count ?? 0);
    }
    case 'zikr': {
      const { count, error } = await supabaseAdmin
        .from('pledges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', 'zikr')
        .gte('count', 5)
        .gte('created_at', dayStartIso)
        .lt('created_at', dayEndIso);
      if (error) {
        if (error.code === '42P01') return 0;
        throw error;
      }
      return Number(count ?? 0);
    }
    case 'hadith': {
      const { count, error } = await supabaseAdmin
        .from('game_progress')
        .select('gameid', { count: 'exact', head: true })
        .eq('uid', userId)
        .eq('gameid', 'activity-hadith')
        .gt('points', 0)
        .gte('playedat', dayStartIso)
        .lt('playedat', dayEndIso);
      if (error) {
        if (error.code === '42P01') return 0;
        throw error;
      }
      return Number(count ?? 0);
    }
    case 'arabic': {
      const { count, error } = await supabaseAdmin
        .from('game_progress')
        .select('gameid', { count: 'exact', head: true })
        .eq('uid', userId)
        .eq('gameid', 'activity-arabic')
        .gt('points', 0)
        .gte('playedat', dayStartIso)
        .lt('playedat', dayEndIso);
      if (error) {
        if (error.code === '42P01') return 0;
        throw error;
      }
      return Number(count ?? 0);
    }
    case 'salah': {
      const { count, error } = await supabaseAdmin
        .from('game_progress')
        .select('gameid', { count: 'exact', head: true })
        .eq('uid', userId)
        .eq('gameid', 'activity-salah')
        .gt('points', 0)
        .gte('playedat', dayStartIso)
        .lt('playedat', dayEndIso);
      if (error) {
        if (error.code === '42P01') return 0;
        throw error;
      }
      return Number(count ?? 0);
    }
    case 'story_quiz': {
      const { count, error } = await supabaseAdmin
        .from('game_progress')
        .select('gameid', { count: 'exact', head: true })
        .eq('uid', userId)
        .eq('gameid', 'activity-story-quiz')
        .gt('points', 0)
        .gte('playedat', dayStartIso)
        .lt('playedat', dayEndIso);
      if (error) {
        if (error.code === '42P01') return 0;
        throw error;
      }
      return Number(count ?? 0);
    }
    case 'creative':
    case 'story_choice':
    case 'dua':
    case 'kindness':
    case 'manners': {
      const gameId =
        activity === 'story_choice' ? 'activity-story-choice' : `activity-${activity}`;
      const { count, error } = await supabaseAdmin
        .from('game_progress')
        .select('gameid', { count: 'exact', head: true })
        .eq('uid', userId)
        .eq('gameid', gameId)
        .gt('points', 0)
        .gte('playedat', dayStartIso)
        .lt('playedat', dayEndIso);
      if (error) {
        if (error.code === '42P01') return 0;
        throw error;
      }
      return Number(count ?? 0);
    }
    default:
      return 0;
  }
}

export async function canEarnActivityPoints(
  userId: string,
  activity: DailyEarnActivity
): Promise<{ allowed: boolean; used: number; limit: number; message?: string }> {
  const limit = getActivityDailyLimit(activity);
  const used = await countActivityCompletionsToday(userId, activity);

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      message: activityLimitMessage(activity, limit),
    };
  }

  return { allowed: true, used, limit };
}

export async function hasLoggedAllSalahToday(userId: string, dateKey: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('salah_entries')
    .select('prayer')
    .eq('user_id', userId)
    .eq('date', dateKey);

  if (error) {
    if (error.code === '42P01') return false;
    throw error;
  }

  const prayers = new Set((data || []).map((row) => String(row.prayer)));
  return SALAH_PRAYERS.every((p) => prayers.has(p.key));
}

export async function getDailyActivityStatus(userId: string) {
  const activities: DailyEarnActivity[] = [
    'quiz',
    'game',
    'story_quiz',
    'durood',
    'zikr',
    'hadith',
    'salah',
  ];
  const rows = await Promise.all(
    activities.map(async (activity) => {
      const limit = getActivityDailyLimit(activity);
      const used = await countActivityCompletionsToday(userId, activity);
      return {
        activity,
        used,
        limit,
        remaining: Math.max(0, limit - used),
        pointsEach: ACTIVITY_BONUS_POINTS,
      };
    })
  );

  return {
    activities: rows,
    quizMaxAttempts: MAX_DAILY_QUIZ_ATTEMPTS,
  };
}
