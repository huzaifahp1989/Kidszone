import { describe, expect, it } from 'vitest'
import { resolveSubmittedTopicQuestions, rotateTopicQuizOptions } from '@/lib/quiz-topic-questions'
import { getTopicQuizQuestions } from '@/lib/quiz-topics'
import { getQuizQuestionPool } from '@/lib/quiz-question-pool'

const quizPool = getQuizQuestionPool()

describe('resolveSubmittedTopicQuestions', () => {
  it('accepts the exact question set the client answered', () => {
    const daySeed = '2026-06-23'
    const selected = getTopicQuizQuestions(quizPool, 'hadith', daySeed, 5, { userId: 'learner-2' })
    const resolved = resolveSubmittedTopicQuestions('hadith', selected.map((q) => String(q.id)))
    expect(resolved.map((q) => q.id)).toEqual(selected.map((q) => q.id))
  })

  it('rejects invalid or partial submissions', () => {
    expect(resolveSubmittedTopicQuestions('hadith', ['hadith-bank-1'])).toEqual([])
    expect(resolveSubmittedTopicQuestions('hadith', ['not-a-real-id', 'x', 'y', 'z', 'w'])).toEqual([])
  })

  it('returns different question sets on consecutive days', () => {
    const dayA = getTopicQuizQuestions(quizPool, 'hadith', '2026-06-23', 5, { userId: 'learner-2' })
    const dayB = getTopicQuizQuestions(quizPool, 'hadith', '2026-06-24', 5, {
      userId: 'learner-2',
      excludeRecentIds: dayA.map((q) => q.id),
    })
    expect(dayB.map((q) => q.id).join(',')).not.toBe(dayA.map((q) => q.id).join(','))
  })

  it('reproduces the same option layout for delivery and scoring', () => {
    const selected = getTopicQuizQuestions(quizPool, 'hadith', '2026-08-01', 5, { userId: 'learner-3' })
    const delivered = rotateTopicQuizOptions(selected, '2026-08-01', 'learner-3', 'hadith')
    const submitted = resolveSubmittedTopicQuestions('hadith', delivered.map((q) => String(q.id)))
    const scored = rotateTopicQuizOptions(submitted, '2026-08-01', 'learner-3', 'hadith')

    expect(scored.map((q) => ({ options: q.options, correctAnswer: q.correctAnswer }))).toEqual(
      delivered.map((q) => ({ options: q.options, correctAnswer: q.correctAnswer }))
    )
  })
})
