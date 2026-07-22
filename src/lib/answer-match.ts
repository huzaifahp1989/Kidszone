import type { ChallengeQuestion } from '@/data/challenge-quizzes';

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  thrice: '3',
  twice: '2',
  once: '1',
};

/**
 * Normalise a typed answer so small differences do not matter:
 * - lowercase
 * - strip Islamic honorifics like (AS), (SAW), "peace be upon him", "prophet"
 * - remove punctuation/diacritics and collapse spaces
 * - map small number words to digits (e.g. "five" -> "5")
 */
export function normalizeAnswer(value: string): string {
  let s = String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip accents/diacritics

  // Remove common honorifics and filler words.
  s = s
    .replace(/\(?\b(as|ra|saw|swt|pbuh|rah|alayhis?\s*salam|alayhi\s*salaam)\b\)?/g, ' ')
    .replace(/\bpeace be upon him\b/g, ' ')
    .replace(/\bhazrat\b|\bprophet\b|\bnabi\b|\bsayyidina\b|\bthe\b/g, ' ');

  // Remove anything that is not a letter, number or space.
  s = s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Map number words to digits (handles single-word numeric answers).
  if (NUMBER_WORDS[s]) return NUMBER_WORDS[s];

  return s;
}

/** Classic Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * Allowed edit distance for a target answer. Longer words tolerate more typos;
 * very short answers (like "5" or "Isa") must be almost exact.
 */
function allowedDistance(target: string): number {
  const len = target.length;
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

function matchesSingle(input: string, target: string): boolean {
  const a = normalizeAnswer(input);
  const b = normalizeAnswer(target);
  if (!a || !b) return false;
  if (a === b) return true;

  // Accept if the answer contains the target as a whole word (e.g. "the right hand" ~ "right").
  const words = a.split(' ');
  if (b.split(' ').length === 1 && words.includes(b)) return true;

  // Otherwise allow small typing mistakes.
  return levenshtein(a, b) <= allowedDistance(b);
}

/** True when the typed response matches the canonical answer or any accepted variation. */
export function isAnswerCorrect(response: string, question: Pick<ChallengeQuestion, 'answer' | 'acceptedAnswers'>): boolean {
  if (!String(response ?? '').trim()) return false;
  const targets = [question.answer, ...(question.acceptedAnswers || [])];
  return targets.some((target) => matchesSingle(response, target));
}
