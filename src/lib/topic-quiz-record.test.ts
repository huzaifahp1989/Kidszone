import { describe, expect, it } from 'vitest'
import { getSessionQuizStorageDate } from '@/lib/topic-quiz-record'

describe('getSessionQuizStorageDate', () => {
  it('returns unique storage dates for different session keys', () => {
    const a = getSessionQuizStorageDate('user-1:quran:session-a')
    const b = getSessionQuizStorageDate('user-1:hadith:session-b')
    expect(a).not.toBe(b)
  })

  it('uses synthetic year range away from real quiz dates', () => {
    const date = getSessionQuizStorageDate('test-session')
    expect(Number(date.slice(0, 4))).toBeGreaterThanOrEqual(2096)
  })
})
