import { describe, expect, it } from 'vitest';
import {
  answerTextForQuestion,
  calculatePercentage,
  isWrittenCompetitionOpen,
  publicDisplayName,
  slugifyCompetitionName,
  toPublicQuestion,
  unknownErrorMessage,
} from '@/lib/written-competition';
import {
  RABI_UL_AWWAL_SEED_COMPETITION,
  RABI_UL_AWWAL_SEED_QUESTIONS,
  rabiUlAwwalPublicFallbackPayload,
} from '@/lib/written-competition-seed';

describe('written competition helpers', () => {
  it('formats winner names as first name plus initial', () => {
    expect(publicDisplayName('Ahmed Khan')).toBe('Ahmed K.');
    expect(publicDisplayName('Fatima')).toBe('Fatima');
    expect(publicDisplayName('  Maryam  bint  Ali  ')).toBe('Maryam A.');
    expect(publicDisplayName('')).toBe('Winner');
  });

  it('calculates percentage from admin marks only', () => {
    expect(calculatePercentage(78, 100)).toBe(78);
    expect(calculatePercentage(0, 100)).toBe(0);
    expect(calculatePercentage(10, 0)).toBe(0);
  });

  it('opens and closes using competition dates', () => {
    const now = new Date('2026-08-20T12:00:00.000Z');
    expect(
      isWrittenCompetitionOpen(
        { active: true, startDate: '2026-08-19T00:00:00.000Z', closingDate: '2026-09-18T00:00:00.000Z' },
        now
      )
    ).toBe(true);
    expect(
      isWrittenCompetitionOpen(
        { active: true, startDate: '2026-08-21T00:00:00.000Z', closingDate: '2026-09-18T00:00:00.000Z' },
        now
      )
    ).toBe(false);
    expect(isWrittenCompetitionOpen({ active: false, startDate: null, closingDate: null }, now)).toBe(false);
  });

  it('keeps the Rabi ul Awwal competition open until 30 September 2026', () => {
    expect(
      isWrittenCompetitionOpen(
        {
          active: true,
          startDate: '2026-08-21T00:00:00.000Z',
          closingDate: '2026-09-30T23:59:59.999Z',
        },
        new Date('2026-09-30T22:00:00.000Z')
      )
    ).toBe(true);

    expect(
      isWrittenCompetitionOpen(
        {
          active: true,
          startDate: '2026-08-21T00:00:00.000Z',
          closingDate: '2026-09-30T23:59:59.999Z',
        },
        new Date('2026-10-01T00:00:00.000Z')
      )
    ).toBe(false);
  });

  it('never exposes marking fields on public questions', () => {
    const publicQuestion = toPublicQuestion({
      id: 'q1',
      questionNumber: 1,
      questionText: 'Explain the Hijrah.',
      difficulty: 'challenging',
      topic: 'Hijrah',
      maxMarks: 10,
      active: true,
      expectedAnswer: 'SECRET expected',
      markingGuidance: 'SECRET guide',
      minRequiredPoints: 5,
      source: 'SECRET source',
      explanation: 'SECRET explanation',
    });
    expect(publicQuestion).toEqual({
      id: 'q1',
      questionNumber: 1,
      questionText: 'Explain the Hijrah.',
      difficulty: 'challenging',
      topic: 'Hijrah',
      maxMarks: 10,
      active: true,
    });
    expect(JSON.stringify(publicQuestion)).not.toContain('SECRET');
  });

  it('slugifies reusable competition names', () => {
    expect(slugifyCompetitionName('Ramadan Seerah Quiz')).toBe('ramadan-seerah-quiz');
  });

  it('reads PostgREST error messages that are not Error instances', () => {
    expect(unknownErrorMessage({ message: 'column written_competition_questions.foo does not exist' })).toBe(
      'column written_competition_questions.foo does not exist'
    );
    expect(unknownErrorMessage('nope')).toBe('Unexpected error');
  });

  it('matches written answers by id, question number, or preview id', () => {
    const question = { id: 'uuid-3', questionNumber: 3 };
    expect(answerTextForQuestion({ 'uuid-3': 'By id' }, question)).toBe('By id');
    expect(answerTextForQuestion({ '3': 'By number' }, question)).toBe('By number');
    expect(answerTextForQuestion({ 'preview-q-3': 'By preview' }, question)).toBe('By preview');
  });

  it('serves ten Rabi ul Awwal questions in the public fallback payload', () => {
    const payload = rabiUlAwwalPublicFallbackPayload();
    expect(RABI_UL_AWWAL_SEED_QUESTIONS).toHaveLength(10);
    expect(payload.questions).toHaveLength(10);
    expect(payload.prizes).toHaveLength(2);
    expect(
      isWrittenCompetitionOpen(payload.competition, new Date('2026-08-22T10:00:00.000Z'))
    ).toBe(true);
    expect(payload.questions[0]?.questionText).toContain('first revelation');
    expect(JSON.stringify(payload.questions)).not.toContain('expectedAnswer');
    expect(RABI_UL_AWWAL_SEED_COMPETITION.maxAttempts).toBe(1);
  });
});
