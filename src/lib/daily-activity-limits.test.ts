import { describe, expect, it } from 'vitest'
import {
  countGameEarningSessions,
  isGameEarningSessionRow,
} from '@/lib/daily-activity-limits'
import { ACTIVITY_BONUS_POINTS, MAX_DAILY_GAME_COMPLETIONS } from '@/lib/points-policy'

describe('game earning session counting', () => {
  it('counts only game rows with points > 0', () => {
    const rows = [
      { gameid: 'hangman', points: ACTIVITY_BONUS_POINTS },
      { gameid: 'crossword', points: 0 },
      { gameid: 'activity-hadith', points: 25 },
      { gameid: 'scramble', points: ACTIVITY_BONUS_POINTS },
    ]
    expect(countGameEarningSessions(rows)).toBe(2)
  })

  it('allows two earning sessions per day policy', () => {
    const rows = [
      { gameid: 'hangman', points: ACTIVITY_BONUS_POINTS },
      { gameid: 'hangman#session-2', points: ACTIVITY_BONUS_POINTS },
    ]
    expect(countGameEarningSessions(rows)).toBe(2)
    expect(countGameEarningSessions(rows)).toBeLessThanOrEqual(MAX_DAILY_GAME_COMPLETIONS)
  })

  it('ignores activity markers and zero-point replays', () => {
    expect(isGameEarningSessionRow({ gameid: 'activity-salah', points: 25 })).toBe(false)
    expect(isGameEarningSessionRow({ gameid: 'word-search-quran', points: 0 })).toBe(false)
    expect(isGameEarningSessionRow({ gameid: 'hajj-tawaf', points: 25 })).toBe(true)
  })
})
