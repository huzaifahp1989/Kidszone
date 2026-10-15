import { describe, expect, it } from 'vitest';
import {
  isOctoberHadithQuizOpen,
  OCTOBER_HADITH_QUESTIONS,
  validateOctoberHadithSubmission,
} from './october-hadith-quiz';

const completeSubmission = () => ({
  fullName: 'Aisha Khan',
  age: 10,
  madrasah: 'Greenwood Madrasah',
  city: 'London',
  answers: Object.fromEntries(OCTOBER_HADITH_QUESTIONS.map(({ id }) => [id, `Answer for ${id}`])),
});

describe('October Hadith quiz', () => {
  it('has ten free-response questions across all three difficulties', () => {
    expect(OCTOBER_HADITH_QUESTIONS).toHaveLength(10);
    expect(OCTOBER_HADITH_QUESTIONS.filter(({ difficulty }) => difficulty === 'Easy')).toHaveLength(4);
    expect(OCTOBER_HADITH_QUESTIONS.filter(({ difficulty }) => difficulty === 'Medium')).toHaveLength(3);
    expect(OCTOBER_HADITH_QUESTIONS.filter(({ difficulty }) => difficulty === 'Difficult')).toHaveLength(3);
    expect(OCTOBER_HADITH_QUESTIONS.every(({ source }) => source)).toBe(true);
  });

  it('accepts submissions only during October 2026 through the 30th', () => {
    expect(isOctoberHadithQuizOpen(new Date('2026-10-01T00:00:00.000Z'))).toBe(true);
    expect(isOctoberHadithQuizOpen(new Date('2026-10-30T23:59:59.999Z'))).toBe(true);
    expect(isOctoberHadithQuizOpen(new Date('2026-09-30T23:59:59.999Z'))).toBe(false);
    expect(isOctoberHadithQuizOpen(new Date('2026-10-31T00:00:00.000Z'))).toBe(false);
  });

  it('validates participant details and all ten free-response answers', () => {
    const result = validateOctoberHadithSubmission(completeSubmission());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.submission.fullName).toBe('Aisha Khan');
      expect(Object.keys(result.submission.answers)).toHaveLength(10);
    }
  });

  it('rejects incomplete answers, invalid ages, and unexpected answer keys', () => {
    const submission = completeSubmission();
    delete submission.answers['hadith-10'];
    expect(validateOctoberHadithSubmission(submission).ok).toBe(false);

    expect(validateOctoberHadithSubmission({ ...completeSubmission(), age: 99 }).ok).toBe(false);
    expect(validateOctoberHadithSubmission({
      ...completeSubmission(),
      answers: { ...completeSubmission().answers, extra: 'Not a question' },
    }).ok).toBe(false);
  });
});
