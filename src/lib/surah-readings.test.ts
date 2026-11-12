import { describe, expect, it } from 'vitest';
import {
  getSurahReadingBySlug,
  scoreSurahReadingQuiz,
  SURAH_READINGS,
} from '@/lib/surah-readings';

describe('SURAH_READINGS', () => {
  it('includes the surahs learners asked for', () => {
    const numbers = SURAH_READINGS.map((reading) => reading.number);
    for (const expected of [36, 67, 18, 55, 56, 32, 31, 62]) {
      expect(numbers).toContain(expected);
    }
  });

  it('has unique slugs and surah numbers', () => {
    const slugs = SURAH_READINGS.map((reading) => reading.slug);
    const numbers = SURAH_READINGS.map((reading) => reading.number);
    expect(new Set(slugs).size).toBe(SURAH_READINGS.length);
    expect(new Set(numbers).size).toBe(SURAH_READINGS.length);
  });

  it('gives every surah a well-formed quiz', () => {
    for (const reading of SURAH_READINGS) {
      expect(reading.quizQuestions.length).toBeGreaterThanOrEqual(5);

      const ids = reading.quizQuestions.map((question) => question.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (const question of reading.quizQuestions) {
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(question.correctAnswer).toBeLessThan(question.options.length);
      }
    }
  });

  it('finds a reading by slug', () => {
    expect(getSurahReadingBySlug('yaseen')?.number).toBe(36);
    expect(getSurahReadingBySlug('does-not-exist')).toBeUndefined();
  });
});

describe('scoreSurahReadingQuiz', () => {
  const reading = SURAH_READINGS[0];

  it('passes at 80% or above', () => {
    const perfect = reading.quizQuestions.map((question) => question.correctAnswer);
    expect(scoreSurahReadingQuiz(reading, perfect)).toMatchObject({
      correct: reading.quizQuestions.length,
      percent: 100,
      passed: true,
    });

    const eighty = reading.quizQuestions.map((question, index) =>
      index === 0 ? -1 : question.correctAnswer
    );
    expect(scoreSurahReadingQuiz(reading, eighty).passed).toBe(true);
  });

  it('fails below 80%', () => {
    const sixty = reading.quizQuestions.map((question, index) =>
      index < 2 ? -1 : question.correctAnswer
    );
    const scored = scoreSurahReadingQuiz(reading, sixty);
    expect(scored.passed).toBe(false);
    expect(scored.percent).toBeLessThan(80);
  });
});
