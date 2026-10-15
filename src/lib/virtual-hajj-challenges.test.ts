import { describe, expect, it } from 'vitest';
import {
  gradeVirtualHajjAnswers,
  getVirtualHajjChallengeKey,
  getVirtualHajjQuestions,
} from '@/lib/virtual-hajj-challenges';

describe('Virtual Hajj knowledge challenge', () => {
  const dayOne = new Date('2026-01-01T00:00:00Z');

  it('keeps correct answers out of the question payload and provides four choices', () => {
    const questions = getVirtualHajjQuestions(dayOne);
    expect(questions).toHaveLength(3);
    expect(questions.every((question) => !('answer' in question))).toBe(true);
    expect(questions.every((question) => question.options.length === 4)).toBe(true);
    expect(questions[0].reference).toBe('Quran 2:144');
  });

  it('requires exactly the expected answers before passing', () => {
    expect(
      gradeVirtualHajjAnswers({
        'qiblah-direction': 'a',
        'qiblah-name': 'b',
        'qiblah-place': 'a',
      }, dayOne)
    ).toEqual({ valid: true, correct: true });
    expect(
      gradeVirtualHajjAnswers({
        'qiblah-direction': 'a',
        'qiblah-name': 'b',
        'qiblah-place': 'd',
      }, dayOne)
    ).toEqual({ valid: true, correct: false });
    expect(gradeVirtualHajjAnswers({ 'qiblah-direction': 'a' }, dayOne).valid).toBe(false);
  });

  it('keys daily challenges by UTC date', () => {
    expect(getVirtualHajjChallengeKey(new Date('2026-10-12T23:59:00Z'))).toBe(
      'tawaf-knowledge-2026-10-12'
    );
    expect(getVirtualHajjChallengeKey(new Date('2026-10-13T00:00:00Z'))).toBe(
      'tawaf-knowledge-2026-10-13'
    );
  });

  it('rotates among six non-repeating daily question sets', () => {
    const sets = Array.from({ length: 6 }, (_, day) =>
      getVirtualHajjQuestions(new Date(`2026-01-0${day + 1}T00:00:00Z`))
    );
    const firstQuestionIds = sets.map((set) => set[0].id);
    expect(new Set(firstQuestionIds).size).toBe(6);
    expect(getVirtualHajjQuestions(new Date('2026-01-07T00:00:00Z'))[0].id).toBe(
      firstQuestionIds[0]
    );
  });
});
