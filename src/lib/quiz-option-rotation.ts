/**
 * Rotate (shuffle) multiple-choice options for topic quizzes so the correct
 * answer is not always in the same letter position.
 */

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededRng(seed: number) {
  let state = seed || 1
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  const rand = seededRng(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Bump this to force a new option layout pattern for returning learners. */
export const QUIZ_OPTION_ROTATION_VERSION = 'opt-v3'

export type QuestionWithOptions = {
  id: string
  options: string[]
  correctAnswer: number
  [key: string]: unknown
}

/**
 * Deterministically rotate options for a question.
 * Same seed → same layout (needed so submit scoring matches what the learner saw).
 */
export function rotateQuestionOptions<T extends QuestionWithOptions>(
  question: T,
  seedKey: string
): T {
  const options = Array.isArray(question.options) ? question.options.map(String) : []
  if (options.length < 2) return question

  const correctIdx = Number(question.correctAnswer)
  const correctText =
    Number.isInteger(correctIdx) && correctIdx >= 0 && correctIdx < options.length
      ? options[correctIdx]
      : options[0]

  const seed = hashString(`${QUIZ_OPTION_ROTATION_VERSION}:${seedKey}:${question.id}`)
  const rotated = seededShuffle(options, seed)
  const newCorrect = rotated.findIndex((opt) => opt === correctText)

  return {
    ...question,
    options: rotated,
    correctAnswer: newCorrect >= 0 ? newCorrect : 0,
  }
}

export function buildOptionRotationSeed(parts: {
  daySeed: string
  userId?: string
  topicId?: string
  attemptIndex?: number
}): string {
  return [
    parts.daySeed || 'day',
    parts.userId || 'anon',
    parts.topicId || 'topic',
    `a${parts.attemptIndex ?? 0}`,
  ].join(':')
}
