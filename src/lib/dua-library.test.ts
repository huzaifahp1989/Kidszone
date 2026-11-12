import { describe, expect, it } from 'vitest';
import {
  ALLAH_99_NAMES,
  DUA_CATEGORIES,
  NAMES_QUIZ_QUESTIONS,
  getDuaCategoryBySlug,
  readDuaProgress,
  scoreDuaQuiz,
  writeDuaProgress,
  type DuaQuizQuestion,
} from '@/data/dua-library';

function expectWellFormedQuiz(questions: DuaQuizQuestion[]) {
  expect(questions.length).toBeGreaterThanOrEqual(5);
  for (const question of questions) {
    expect(question.options.length).toBeGreaterThanOrEqual(2);
    expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
    expect(question.correctAnswer).toBeLessThan(question.options.length);
  }
}

describe('dua-library', () => {
  it('lists all 99 names of Allah in order', () => {
    expect(ALLAH_99_NAMES).toHaveLength(99);
    ALLAH_99_NAMES.forEach((name, index) => {
      expect(name.number).toBe(index + 1);
      expect(name.arabic.length).toBeGreaterThan(0);
      expect(name.transliteration.length).toBeGreaterThan(0);
      expect(name.meaning.length).toBeGreaterThan(0);
    });
  });

  it('has unique category slugs', () => {
    const slugs = DUA_CATEGORIES.map((category) => category.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every category duas with Arabic, translation and a reference', () => {
    for (const category of DUA_CATEGORIES) {
      expect(category.duas.length).toBeGreaterThanOrEqual(5);
      for (const dua of category.duas) {
        expect(dua.arabic.length).toBeGreaterThan(0);
        expect(dua.translation.length).toBeGreaterThan(0);
        expect(dua.reference.length).toBeGreaterThan(0);
      }
    }
  });

  it('gives every category a well-formed quiz', () => {
    for (const category of DUA_CATEGORIES) {
      expectWellFormedQuiz(category.quizQuestions);
    }
    expectWellFormedQuiz(NAMES_QUIZ_QUESTIONS);
  });

  it('finds a category by slug', () => {
    expect(getDuaCategoryBySlug('hardship')?.title).toContain('Difficulty');
    expect(getDuaCategoryBySlug('nope')).toBeUndefined();
  });

  it('scores a quiz with an 80% pass mark', () => {
    const questions: DuaQuizQuestion[] = Array.from({ length: 5 }, (_, i) => ({
      id: `q-${i}`,
      question: `Question ${i}`,
      options: ['a', 'b', 'c', 'd'],
      correctAnswer: 1,
    }));

    const perfect = scoreDuaQuiz(questions, [1, 1, 1, 1, 1]);
    expect(perfect).toMatchObject({ correct: 5, total: 5, percent: 100, passed: true });

    const fourOfFive = scoreDuaQuiz(questions, [1, 1, 1, 1, 0]);
    expect(fourOfFive.percent).toBe(80);
    expect(fourOfFive.passed).toBe(true);

    const threeOfFive = scoreDuaQuiz(questions, [1, 1, 1, 0, 0]);
    expect(threeOfFive.percent).toBe(60);
    expect(threeOfFive.passed).toBe(false);
  });

  it('round-trips progress through localStorage', () => {
    writeDuaProgress('user-1', {
      hardship: { completed: true, score: 5, percent: 100, completedAt: '2026-01-01T00:00:00.000Z' },
    });
    expect(readDuaProgress('user-1').hardship?.completed).toBe(true);
    expect(readDuaProgress('user-2')).toEqual({});
  });
});
