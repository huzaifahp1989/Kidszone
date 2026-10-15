export interface AchievementDefinition {
  id: string;
  emoji: string;
  label: string;
  description: string;
  category: 'quiz' | 'habits' | 'sadaqah' | 'general' | 'quran' | 'arabic' | 'hadith';
}

export interface ActivitySummary {
  quizCount: number;
  gameCount: number;
  salahDays: number;
  streak: number;
  totalPoints: number;
  habitDays: number;
  sadaqahCount: number;
  quranCount?: number;
  hadithCount?: number;
  arabicCount?: number;
  totalActivities?: number;
  weeklyMilestoneClaimed?: boolean;
  activeDays?: number;
}

export interface AchievementStatus extends AchievementDefinition {
  unlocked: boolean;
  progress: number;
  target: number;
  unit: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first-quiz', emoji: '🧠', label: 'First Quiz', description: 'Complete your first quiz', category: 'quiz' },
  { id: 'first-steps', emoji: '👣', label: 'First Steps', description: 'Complete your first learning activity', category: 'general' },
  { id: 'quiz-star', emoji: '⭐', label: 'Quiz Star', description: 'Complete 10 quizzes', category: 'quiz' },
  { id: 'quiz-expert', emoji: '🌟', label: 'Quiz Expert', description: 'Complete 25 quizzes', category: 'quiz' },
  { id: 'quiz-champion', emoji: '🏅', label: 'Quiz Champion', description: 'Complete 50 quizzes', category: 'quiz' },
  { id: 'habit-starter', emoji: '🌱', label: 'Habit Starter', description: 'Log Feature Lab good deeds on 1 day', category: 'habits' },
  { id: 'habit-hero', emoji: '💚', label: 'Habit Hero', description: 'Log good deeds on 7 different days', category: 'habits' },
  { id: 'sadaqah-giver', emoji: '🪙', label: 'Sadaqah Giver', description: 'Log your first sadaqah', category: 'sadaqah' },
  { id: 'sadaqah-star', emoji: '✨', label: 'Sadaqah Star', description: 'Log sadaqah 5 times', category: 'sadaqah' },
  { id: 'game-player', emoji: '🎮', label: 'Game Player', description: 'Play 5 games', category: 'general' },
  { id: 'salah-hero', emoji: '🕌', label: 'Salah Hero', description: 'Log salah on 7 different days', category: 'general' },
  { id: 'streak-starter', emoji: '🔥', label: 'Streak Starter', description: 'Reach a 3-day streak', category: 'general' },
  { id: 'streak-master', emoji: '🏆', label: 'Streak Master', description: 'Reach a 7-day streak', category: 'general' },
  { id: 'seven-day-streak', emoji: '📅', label: '7-Day Streak', description: 'Learn for 7 days in a row', category: 'general' },
  { id: 'streak-explorer', emoji: '🧭', label: 'Two-Week Explorer', description: 'Learn for 14 days in a row', category: 'general' },
  { id: 'streak-legend', emoji: '🌙', label: '30-Day Legend', description: 'Learn for 30 days in a row', category: 'general' },
  { id: 'active-days-5', emoji: '🌿', label: 'Steady Steps', description: 'Learn on 5 different days in the last 28 days', category: 'general' },
  { id: 'active-days-14', emoji: '🌳', label: 'Growing Scholar', description: 'Learn on 14 different days in the last 28 days', category: 'general' },
  { id: 'point-collector', emoji: '💫', label: 'Point Collector', description: 'Earn 100 total points', category: 'general' },
  { id: 'young-scholar', emoji: '📚', label: 'Young Scholar', description: 'Earn 500 total points', category: 'general' },
  { id: 'quran-explorer', emoji: '📖', label: 'Quran Explorer', description: 'Complete 10 Quran activities', category: 'quran' },
  { id: 'arabic-star', emoji: '🔤', label: 'Arabic Star', description: 'Complete an Arabic learning activity', category: 'arabic' },
  { id: 'hadith-learner', emoji: '💬', label: 'Hadith Learner', description: 'Complete 10 Hadith activities', category: 'hadith' },
  { id: 'quran-scholar', emoji: '📜', label: 'Quran Scholar', description: 'Complete 25 Quran activities', category: 'quran' },
  { id: 'knowledge-builder', emoji: '🧩', label: 'Knowledge Builder', description: 'Complete 50 learning activities', category: 'general' },
  { id: 'knowledge-master', emoji: '🎓', label: 'Knowledge Master', description: 'Complete 100 learning activities', category: 'general' },
  { id: 'weekly-achiever', emoji: '🎯', label: 'Weekly Achiever', description: 'Claim the weekly milestone bonus', category: 'general' },
];

function achievementProgress(
  id: string,
  summary: ActivitySummary
): { value: number; target: number; unit: string } {
  switch (id) {
    case 'first-quiz':
      return { value: summary.quizCount, target: 1, unit: 'quizzes' };
    case 'first-steps':
      return { value: summary.quizCount + summary.gameCount, target: 1, unit: 'activities' };
    case 'quiz-star':
      return { value: summary.quizCount, target: 10, unit: 'quizzes' };
    case 'quiz-expert':
      return { value: summary.quizCount, target: 25, unit: 'quizzes' };
    case 'quiz-champion':
      return { value: summary.quizCount, target: 50, unit: 'quizzes' };
    case 'habit-starter':
      return { value: summary.habitDays, target: 1, unit: 'days' };
    case 'habit-hero':
      return { value: summary.habitDays, target: 7, unit: 'days' };
    case 'sadaqah-giver':
      return { value: summary.sadaqahCount, target: 1, unit: 'acts' };
    case 'sadaqah-star':
      return { value: summary.sadaqahCount, target: 5, unit: 'acts' };
    case 'game-player':
      return { value: summary.gameCount, target: 5, unit: 'games' };
    case 'salah-hero':
      return { value: summary.salahDays, target: 7, unit: 'days' };
    case 'streak-starter':
      return { value: summary.streak, target: 3, unit: 'days' };
    case 'streak-master':
    case 'seven-day-streak':
      return { value: summary.streak, target: 7, unit: 'days' };
    case 'streak-explorer':
      return { value: summary.streak, target: 14, unit: 'days' };
    case 'streak-legend':
      return { value: summary.streak, target: 30, unit: 'days' };
    case 'active-days-5':
      return { value: summary.activeDays ?? 0, target: 5, unit: 'days' };
    case 'active-days-14':
      return { value: summary.activeDays ?? 0, target: 14, unit: 'days' };
    case 'point-collector':
      return { value: summary.totalPoints, target: 100, unit: 'points' };
    case 'young-scholar':
      return { value: summary.totalPoints, target: 500, unit: 'points' };
    case 'quran-explorer':
      return { value: summary.quranCount ?? 0, target: 10, unit: 'activities' };
    case 'quran-scholar':
      return { value: summary.quranCount ?? 0, target: 25, unit: 'activities' };
    case 'arabic-star':
      return { value: summary.arabicCount ?? 0, target: 1, unit: 'activities' };
    case 'hadith-learner':
      return { value: summary.hadithCount ?? 0, target: 10, unit: 'activities' };
    case 'knowledge-builder':
      return {
        value: summary.totalActivities ?? summary.quizCount + summary.gameCount,
        target: 50,
        unit: 'activities',
      };
    case 'knowledge-master':
      return {
        value: summary.totalActivities ?? summary.quizCount + summary.gameCount,
        target: 100,
        unit: 'activities',
      };
    case 'weekly-achiever':
      return { value: summary.weeklyMilestoneClaimed ? 1 : 0, target: 1, unit: 'milestone' };
    default:
      return { value: 0, target: 1, unit: 'activities' };
  }
}

export function computeAchievements(summary: ActivitySummary): AchievementStatus[] {
  return ACHIEVEMENTS.map((def) => {
    const { value, target, unit } = achievementProgress(def.id, summary);
    return {
      ...def,
      unlocked: value >= target,
      progress: Math.min(target, Math.max(0, value)),
      target,
      unit,
    };
  });
}

export function countUnlockedAchievements(summary: ActivitySummary): number {
  return computeAchievements(summary).filter((a) => a.unlocked).length;
}
