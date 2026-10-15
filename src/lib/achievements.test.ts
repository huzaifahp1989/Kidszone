import { describe, expect, it } from 'vitest';
import { computeAchievements, type ActivitySummary } from '@/lib/achievements';

const emptySummary: ActivitySummary = {
  quizCount: 0,
  gameCount: 0,
  salahDays: 0,
  streak: 0,
  totalPoints: 0,
  habitDays: 0,
  sadaqahCount: 0,
  activeDays: 0,
  quranCount: 0,
  hadithCount: 0,
  arabicCount: 0,
  totalActivities: 0,
};

describe('computeAchievements', () => {
  it('tracks activity-day and streak progress without unlocking early', () => {
    const achievements = computeAchievements({
      ...emptySummary,
      activeDays: 4,
      streak: 13,
    });

    expect(achievements.find((item) => item.id === 'active-days-5')).toMatchObject({
      unlocked: false,
      progress: 4,
      target: 5,
    });
    expect(achievements.find((item) => item.id === 'streak-explorer')).toMatchObject({
      unlocked: false,
      progress: 13,
      target: 14,
    });
  });

  it('unlocks newly added milestones at their exact targets', () => {
    const achievements = computeAchievements({
      ...emptySummary,
      activeDays: 14,
      streak: 30,
      quizCount: 25,
      quranCount: 25,
      totalActivities: 100,
    });

    for (const id of [
      'active-days-14',
      'streak-legend',
      'quiz-expert',
      'quran-scholar',
      'knowledge-master',
    ]) {
      expect(achievements.find((item) => item.id === id)?.unlocked).toBe(true);
    }
  });

  it('preserves previously unlocked achievement thresholds', () => {
    const achievements = computeAchievements({
      ...emptySummary,
      quizCount: 10,
      streak: 7,
    });

    expect(achievements.find((item) => item.id === 'quiz-star')?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === 'streak-master')?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === 'quiz-expert')?.unlocked).toBe(false);
  });
});
