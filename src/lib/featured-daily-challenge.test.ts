import { describe, expect, it } from 'vitest';
import {
  FEATURED_DAILY_CHALLENGE_QUESTION_BANK,
} from '@/data/featured-daily-islamic-challenge';
import {
  FEATURED_DAILY_CHALLENGE_QUESTION_COUNT,
  buildFeaturedDailyQuizFromHistory,
} from '@/lib/featured-daily-challenge';

describe('featured daily challenge selector', () => {
  it('builds a 10-question quiz with unique categories', () => {
    const quiz = buildFeaturedDailyQuizFromHistory('user-1', '2026-07-25', {
      masteredQuestionIds: [],
      todayQuestionIds: [],
      recentQuestionIds: [],
      attemptsToday: 0,
    });

    expect(quiz.questions).toHaveLength(FEATURED_DAILY_CHALLENGE_QUESTION_COUNT);
    expect(new Set(quiz.questions.map((question) => question.categoryId)).size).toBe(
      FEATURED_DAILY_CHALLENGE_QUESTION_COUNT
    );

    for (const question of quiz.questions) {
      expect(question.options).toHaveLength(4);
      expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
      expect(question.correctAnswer).toBeLessThan(4);
    }
  });

  it('does not reuse mastered questions when alternatives exist', () => {
    const masteredQuestionIds = FEATURED_DAILY_CHALLENGE_QUESTION_BANK.slice(0, 6).map((question) => question.id);
    const quiz = buildFeaturedDailyQuizFromHistory('user-2', '2026-07-25', {
      masteredQuestionIds,
      todayQuestionIds: [],
      recentQuestionIds: [],
      attemptsToday: 0,
    });

    expect(quiz.questions).toHaveLength(FEATURED_DAILY_CHALLENGE_QUESTION_COUNT);
    for (const question of quiz.questions) {
      expect(masteredQuestionIds).not.toContain(question.id);
    }
  });
});
