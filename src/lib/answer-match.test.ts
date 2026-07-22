import { describe, it, expect } from 'vitest';
import { normalizeAnswer, levenshtein, isAnswerCorrect } from './answer-match';

const q = (answer: string, acceptedAnswers: string[] = []) => ({ answer, acceptedAnswers });

describe('normalizeAnswer', () => {
  it('lowercases, strips honorifics and punctuation', () => {
    expect(normalizeAnswer('Prophet Ibrahim (AS)!')).toBe('ibrahim');
    expect(normalizeAnswer('  Muhammad ﷺ ')).toBe('muhammad');
  });

  it('maps small number words to digits', () => {
    expect(normalizeAnswer('five')).toBe('5');
    expect(normalizeAnswer('three')).toBe('3');
  });
});

describe('levenshtein', () => {
  it('computes edit distance', () => {
    expect(levenshtein('nuh', 'nuh')).toBe(0);
    expect(levenshtein('yusuf', 'yousuf')).toBe(1);
  });
});

describe('isAnswerCorrect', () => {
  it('accepts the exact canonical answer', () => {
    expect(isAnswerCorrect('Musa', q('Musa'))).toBe(true);
  });

  it('accepts listed variations and English names', () => {
    expect(isAnswerCorrect('Noah', q('Nuh', ['Noah', 'Nooh']))).toBe(true);
    expect(isAnswerCorrect('Abraham', q('Ibrahim', ['Abraham']))).toBe(true);
  });

  it('tolerates minor typing mistakes', () => {
    expect(isAnswerCorrect('Ibraheem', q('Ibrahim', ['Ibraheem']))).toBe(true);
    expect(isAnswerCorrect('Sulaymaan', q('Sulayman', ['Sulaiman']))).toBe(true);
    expect(isAnswerCorrect('Ramadhan', q('Ramadan', ['Ramadhan']))).toBe(true);
  });

  it('accepts number answers typed as words', () => {
    expect(isAnswerCorrect('five', q('5', ['five']))).toBe(true);
    expect(isAnswerCorrect('5', q('5'))).toBe(true);
  });

  it('accepts a phrase containing the key word', () => {
    expect(isAnswerCorrect('the right hand', q('Right', ['Right hand']))).toBe(true);
  });

  it('rejects clearly wrong answers', () => {
    expect(isAnswerCorrect('Musa', q('Nuh', ['Noah']))).toBe(false);
    expect(isAnswerCorrect('', q('Adam'))).toBe(false);
    expect(isAnswerCorrect('London', q('Hira', ['Cave of Hira']))).toBe(false);
  });
});
