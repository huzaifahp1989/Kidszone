import { describe, expect, it } from 'vitest'
import {
  QUESTIONS_PER_TOPIC_QUIZ,
  resolveSubmittedTopicQuestions,
  resolveTopicQuizQuestionsFromIds,
} from '@/lib/quiz-topic-questions'
import { getTopicQuizQuestions } from '@/lib/quiz-topics'
import { getQuizQuestionPool } from '@/lib/quiz-question-pool'
import { getAgeSpecificQuizPool } from '@/lib/age-quiz-pool'

const quizPool = getQuizQuestionPool()

describe('resolveSubmittedTopicQuestions', () => {
  it('accepts the exact question set the client answered', () => {
    const daySeed = '2026-06-23'
    const selected = getTopicQuizQuestions(quizPool, 'hadith', daySeed, 5, { userId: 'learner-2' })
    const resolved = resolveSubmittedTopicQuestions(
      'hadith',
      selected.map((q) => String(q.id))
    )
    expect(resolved.map((q) => q.id)).toEqual(selected.map((q) => q.id))
  })

  it('accepts fewer than 5 valid question ids from thin/age pools', () => {
    const agePool = getAgeSpecificQuizPool(7)
    const selected = getTopicQuizQuestions(agePool, 'akhlaq', '2026-07-25', 3, {
      userId: 'young-learner',
    })
    expect(selected.length).toBeGreaterThan(0)
    expect(selected.length).toBeLessThanOrEqual(QUESTIONS_PER_TOPIC_QUIZ)

    const resolved = resolveSubmittedTopicQuestions(
      'akhlaq',
      selected.map((q) => String(q.id))
    )
    expect(resolved.map((q) => q.id)).toEqual(selected.map((q) => q.id))
  })

  it('rejects invalid or partial submissions', () => {
    expect(resolveSubmittedTopicQuestions('hadith', ['hadith-bank-1'])).toEqual([])
    expect(resolveSubmittedTopicQuestions('hadith', ['not-a-real-id', 'x', 'y', 'z', 'w'])).toEqual(
      []
    )
  })

  it('returns different question sets on consecutive days', () => {
    const dayA = getTopicQuizQuestions(quizPool, 'hadith', '2026-06-23', 5, { userId: 'learner-2' })
    const dayB = getTopicQuizQuestions(quizPool, 'hadith', '2026-06-24', 5, {
      userId: 'learner-2',
      excludeRecentIds: dayA.map((q) => q.id),
    })
    expect(dayB.map((q) => q.id).join(',')).not.toBe(dayA.map((q) => q.id).join(','))
  })
})

describe('resolveTopicQuizQuestionsFromIds', () => {
  it('keeps the client question set when age-blind regeneration would differ', () => {
    const age = 7
    const agePool = getAgeSpecificQuizPool(age)
    const main = quizPool.filter((q) => q && q.id)
    const seen = new Set<string>()
    const merged = []
    for (const q of [...agePool, ...main]) {
      const id = String(q.id)
      if (seen.has(id)) continue
      seen.add(id)
      merged.push(q)
    }

    const selected = getTopicQuizQuestions(merged, 'hadith', '2026-07-25', 5, {
      userId: 'user-7',
    })
    const ids = selected.map((q) => String(q.id))

    const ageBlind = resolveTopicQuizQuestionsFromIds('hadith', '2026-07-25', 'user-7', ids, [], 0)
    const ageAware = resolveTopicQuizQuestionsFromIds(
      'hadith',
      '2026-07-25',
      'user-7',
      ids,
      [],
      0,
      age
    )

    // Even if age-blind regeneration differs, submitted ids must be preserved.
    expect(ageBlind.map((q) => String(q.id))).toEqual(ids)
    expect(ageAware.map((q) => String(q.id))).toEqual(ids)

    const answers = Object.fromEntries(selected.map((q) => [String(q.id), q.correctAnswer]))
    const completed = ageBlind.every((q) =>
      Object.prototype.hasOwnProperty.call(answers, String(q.id))
    )
    expect(completed).toBe(true)
  })
})
