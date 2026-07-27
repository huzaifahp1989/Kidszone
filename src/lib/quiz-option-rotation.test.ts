import { describe, expect, it } from 'vitest'
import {
  QUIZ_OPTION_ROTATION_VERSION,
  rotateQuestionOptions,
  buildOptionRotationSeed,
} from '@/lib/quiz-option-rotation'

describe('quiz option rotation', () => {
  const question = {
    id: 'demo-1',
    options: ['A-right', 'B-wrong', 'C-wrong', 'D-wrong'],
    correctAnswer: 0,
  }

  it('keeps the correct answer text after rotation', () => {
    const rotated = rotateQuestionOptions(question, 'seed-a')
    expect(rotated.options[rotated.correctAnswer]).toBe('A-right')
    expect(rotated.options).toHaveLength(4)
  })

  it('is deterministic for the same seed', () => {
    const a = rotateQuestionOptions(question, 'same-seed')
    const b = rotateQuestionOptions(question, 'same-seed')
    expect(a.options).toEqual(b.options)
    expect(a.correctAnswer).toBe(b.correctAnswer)
  })

  it('can change option order across different seeds', () => {
    const orders = new Set(
      ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map((seed) =>
        rotateQuestionOptions(question, seed).options.join('|')
      )
    )
    expect(orders.size).toBeGreaterThan(1)
  })

  it('builds a stable rotation seed key', () => {
    expect(buildOptionRotationSeed({ daySeed: '2026-07-25', userId: 'u1', topicId: 'hadith', attemptIndex: 0 })).toContain(
      'hadith'
    )
    expect(QUIZ_OPTION_ROTATION_VERSION).toMatch(/^opt-v/)
  })
})
