import { describe, expect, it } from 'vitest'
import {
  buildTopicQuizId,
  getDailyTopicSeed,
  getTopicById,
  getTopicQuestionCount,
  getTopicQuizQuestions,
  parseTopicQuizId,
  QUIZ_TOPICS,
} from '@/lib/quiz-topics'
import { getQuizQuestionPool } from '@/lib/quiz-question-pool'

const quizPool = getQuizQuestionPool()

const PROPHET_STORY_TOPICS = [
  'story-khidr-musa',
  'story-sulaiman',
  'story-yusuf',
  'story-ibrahim',
  'story-nuh',
  'story-yunus',
  'story-maryam',
] as const

describe('getTopicQuizQuestions', () => {
  it('returns different sets for different daily seeds', () => {
    const dayA = getTopicQuizQuestions(quizPool, 'quran', '2026-06-16', 5)
    const dayB = getTopicQuizQuestions(quizPool, 'quran', '2026-06-17', 5)

    expect(dayA).toHaveLength(5)
    expect(dayB).toHaveLength(5)
    expect(dayA.map((q) => q.id).join(',')).not.toBe(dayB.map((q) => q.id).join(','))
  })

  it('excludes questions already seen today for a second quiz attempt', () => {
    const daySeed = '2026-06-23'
    const first = getTopicQuizQuestions(quizPool, 'quran', daySeed, 5, { userId: 'user-1', attemptIndex: 0 })
    const second = getTopicQuizQuestions(quizPool, 'quran', daySeed, 5, {
      userId: 'user-1',
      attemptIndex: 1,
      excludeTodayIds: first.map((q) => q.id),
    })

    expect(second).toHaveLength(5)
    expect(second.some((q) => first.some((firstQuestion) => firstQuestion.id === q.id))).toBe(false)
  })

  it('prefers questions not seen in the last week when possible', () => {
    const daySeed = '2026-06-23'
    const recent = getTopicQuizQuestions(quizPool, 'hadith', daySeed, 8, { userId: 'user-a' }).map((q) => q.id)
    const nextDay = getTopicQuizQuestions(quizPool, 'hadith', '2026-06-24', 5, {
      userId: 'user-a',
      excludeRecentIds: recent,
    })

    expect(nextDay).toHaveLength(5)
    expect(nextDay.some((q) => recent.includes(q.id))).toBe(false)
  })

  it('uses user id in selection so two users can get different questions', () => {
    const weekSeed = '2026-06-23'
    const userA = getTopicQuizQuestions(quizPool, 'hadith', weekSeed, 5, { userId: 'user-a' })
    const userB = getTopicQuizQuestions(quizPool, 'hadith', weekSeed, 5, { userId: 'user-b' })

    expect(userA.map((q) => q.id).join(',')).not.toBe(userB.map((q) => q.id).join(','))
  })
})

describe('topic quiz ids', () => {
  it('builds and parses topic quiz ids', () => {
    const quizId = buildTopicQuizId('salah', '2026-06-23', '11111111-2222-3333-4444-555555555555')
    expect(quizId).toBe('topic-salah-2026-06-23-11111111-2222-3333-4444-555555555555')

    expect(parseTopicQuizId(quizId)).toEqual({
      topicId: 'salah',
      weekSeed: '2026-06-23',
      userId: '11111111-2222-3333-4444-555555555555',
    })
  })
})

describe('prophet story quiz topics', () => {
  it('registers all Quranic prophet story topics', () => {
    for (const topicId of PROPHET_STORY_TOPICS) {
      expect(getTopicById(topicId)?.group).toBe('quran-stories')
    }
  })

  it('has at least 10 challenging questions per prophet story topic', () => {
    for (const topicId of PROPHET_STORY_TOPICS) {
      const count = getTopicQuestionCount(quizPool, topicId)
      expect(count).toBeGreaterThanOrEqual(10)
    }
  })

  it('returns 5 questions per story quiz attempt', () => {
    const weekSeed = '2026-06-23'
    for (const topicId of PROPHET_STORY_TOPICS) {
      const selected = getTopicQuizQuestions(quizPool, topicId, weekSeed, 5, { userId: 'learner-1' })
      expect(selected).toHaveLength(5)
      expect(selected.every((q) => q.difficulty !== 'Easy')).toBe(true)
    }
  })

  it('parses story topic quiz ids with multi-part topic slugs', () => {
    const quizId = buildTopicQuizId('story-khidr-musa', '2026-06-23', 'user-abc')
    expect(parseTopicQuizId(quizId)).toEqual({
      topicId: 'story-khidr-musa',
      weekSeed: '2026-06-23',
      userId: 'user-abc',
    })
  })

  it('lists prophet stories separately from general topics', () => {
    const storyTopics = QUIZ_TOPICS.filter((topic) => topic.group === 'quran-stories')
    expect(storyTopics.map((topic) => topic.id)).toEqual([...PROPHET_STORY_TOPICS])
  })
})

describe('getDailyTopicSeed', () => {
  it('returns the current UTC calendar date', () => {
    expect(getDailyTopicSeed(new Date('2026-06-25T12:00:00.000Z'))).toBe('2026-06-25')
    expect(getDailyTopicSeed(new Date('2026-06-25T23:59:00.000Z'))).toBe('2026-06-25')
  })
})
