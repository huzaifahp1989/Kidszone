export interface AchievementDefinition {
  id: string;
  emoji: string;
  label: string;
  description: string;
  category: 'quiz' | 'habits' | 'sadaqah' | 'general';
}

export interface ActivitySummary {
  quizCount: number;
  gameCount: number;
  salahDays: number;
  streak: number;
  totalPoints: number;
  habitDays: number;
  sadaqahCount: number;
}

export interface AchievementStatus extends AchievementDefinition {
  unlocked: boolean;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first-quiz', emoji: '🧠', label: 'First Quiz', description: 'Complete your first quiz', category: 'quiz' },
  { id: 'quiz-star', emoji: '⭐', label: 'Quiz Star', description: 'Complete 10 quizzes', category: 'quiz' },
  { id: 'quiz-champion', emoji: '🏅', label: 'Quiz Champion', description: 'Complete 25 quizzes', category: 'quiz' },
  { id: 'habit-starter', emoji: '🌱', label: 'Habit Starter', description: 'Log Feature Lab good deeds on 1 day', category: 'habits' },
  { id: 'habit-hero', emoji: '💚', label: 'Habit Hero', description: 'Log good deeds on 7 different days', category: 'habits' },
  { id: 'sadaqah-giver', emoji: '🪙', label: 'Sadaqah Giver', description: 'Log your first sadaqah', category: 'sadaqah' },
  { id: 'sadaqah-star', emoji: '✨', label: 'Sadaqah Star', description: 'Log sadaqah 5 times', category: 'sadaqah' },
  { id: 'game-player', emoji: '🎮', label: 'Game Player', description: 'Play 5 games', category: 'general' },
  { id: 'salah-hero', emoji: '🕌', label: 'Salah Hero', description: 'Log salah on 7 different days', category: 'general' },
  { id: 'streak-starter', emoji: '🔥', label: 'Streak Starter', description: 'Reach a 3-day streak', category: 'general' },
  { id: 'streak-master', emoji: '🏆', label: 'Streak Master', description: 'Reach a 7-day streak', category: 'general' },
  { id: 'point-collector', emoji: '💫', label: 'Point Collector', description: 'Earn 100 total points', category: 'general' },
  { id: 'young-scholar', emoji: '📚', label: 'Young Scholar', description: 'Earn 500 total points', category: 'general' },
];

function isUnlocked(id: string, summary: ActivitySummary): boolean {
  switch (id) {
    case 'first-quiz':
      return summary.quizCount >= 1;
    case 'quiz-star':
      return summary.quizCount >= 10;
    case 'quiz-champion':
      return summary.quizCount >= 25;
    case 'habit-starter':
      return summary.habitDays >= 1;
    case 'habit-hero':
      return summary.habitDays >= 7;
    case 'sadaqah-giver':
      return summary.sadaqahCount >= 1;
    case 'sadaqah-star':
      return summary.sadaqahCount >= 5;
    case 'game-player':
      return summary.gameCount >= 5;
    case 'salah-hero':
      return summary.salahDays >= 7;
    case 'streak-starter':
      return summary.streak >= 3;
    case 'streak-master':
      return summary.streak >= 7;
    case 'point-collector':
      return summary.totalPoints >= 100;
    case 'young-scholar':
      return summary.totalPoints >= 500;
    default:
      return false;
  }
}

export function computeAchievements(summary: ActivitySummary): AchievementStatus[] {
  return ACHIEVEMENTS.map((def) => ({
    ...def,
    unlocked: isUnlocked(def.id, summary),
  }));
}

export function countUnlockedAchievements(summary: ActivitySummary): number {
  return computeAchievements(summary).filter((a) => a.unlocked).length;
}
