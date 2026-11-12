import { describe, expect, it } from 'vitest';
import {
  QUEST_KEYS,
  WEEKLY_CHEST_BADGE,
  WEEKLY_CHEST_POINTS,
  WEEKLY_QUESTS,
  buildWeeklyQuestBoard,
  isQuestKey,
  questDefinition,
} from '@/lib/weekly-quests-core';

const WEEK = {
  weekStartDate: '2026-10-24', // Saturday
  weekEndDate: '2026-10-31', // next Saturday (exclusive)
};

function board(overrides: Partial<Parameters<typeof buildWeeklyQuestBoard>[0]> = {}) {
  return buildWeeklyQuestBoard({
    todayKey: '2026-10-24',
    ...WEEK,
    progress: {},
    ...overrides,
  });
}

describe('weekly quest definitions', () => {
  it('exposes five distinct quests with positive targets and rewards', () => {
    expect(WEEKLY_QUESTS).toHaveLength(5);
    expect(new Set(WEEKLY_QUESTS.map((q) => q.key)).size).toBe(5);
    for (const quest of WEEKLY_QUESTS) {
      expect(quest.target).toBeGreaterThan(0);
      expect(quest.points).toBeGreaterThan(0);
      expect(quest.href.startsWith('/')).toBe(true);
    }
  });

  it('recognises valid quest keys only', () => {
    expect(isQuestKey('quiz_sprint')).toBe(true);
    expect(isQuestKey('not_a_quest')).toBe(false);
    expect(isQuestKey(null)).toBe(false);
    expect(questDefinition('salah_keeper').title).toBe('Salah Keeper');
  });
});

describe('buildWeeklyQuestBoard', () => {
  it('starts every quest empty with the chest locked', () => {
    const result = board();
    expect(result.quests).toHaveLength(5);
    expect(result.quests.every((q) => q.progress === 0 && !q.completed && !q.claimable)).toBe(true);
    expect(result.summary.completedCount).toBe(0);
    expect(result.summary.allCompleted).toBe(false);
    expect(result.chest.unlocked).toBe(false);
    expect(result.chest.claimed).toBe(false);
    expect(result.chest.points).toBe(WEEKLY_CHEST_POINTS);
    expect(result.chest.badgeName).toBe(WEEKLY_CHEST_BADGE);
    expect(result.claimedKeys).toEqual([]);
  });

  it('clamps progress and marks completed quests as claimable', () => {
    const result = board({ progress: { quiz_sprint: 99, game_explorer: 4 } });
    const quiz = result.quests.find((q) => q.key === 'quiz_sprint')!;
    expect(quiz.progress).toBe(99);
    expect(quiz.completed).toBe(true);
    expect(quiz.claimable).toBe(true);

    const games = result.quests.find((q) => q.key === 'game_explorer')!;
    expect(games.completed).toBe(true);
    expect(result.summary.completedCount).toBe(2);
  });

  it('treats claimed quests as banked but no longer claimable', () => {
    const result = board({
      progress: { quiz_sprint: 5 },
      claimedKeys: ['quiz_sprint'],
    });
    const quiz = result.quests.find((q) => q.key === 'quiz_sprint')!;
    expect(quiz.claimed).toBe(true);
    expect(quiz.claimable).toBe(false);
    expect(result.summary.claimedCount).toBe(1);
    expect(result.claimedKeys).toEqual(['quiz_sprint']);
  });

  it('ignores unknown claimed keys and negative progress', () => {
    const result = board({ progress: { good_deeds: -5 }, claimedKeys: ['bogus'] });
    const deeds = result.quests.find((q) => q.key === 'good_deeds')!;
    expect(deeds.progress).toBe(0);
    expect(result.claimedKeys).toEqual([]);
  });

  it('unlocks the chest once every quest is complete', () => {
    const progress = Object.fromEntries(WEEKLY_QUESTS.map((q) => [q.key, q.target]));
    const result = board({ progress });
    expect(result.summary.allCompleted).toBe(true);
    expect(result.chest.unlocked).toBe(true);
    expect(result.summary.totalPointsAvailable).toBe(
      WEEKLY_QUESTS.reduce((sum, q) => sum + q.points, 0) + WEEKLY_CHEST_POINTS
    );
  });

  it('reports a claimed chest with its timestamp', () => {
    const result = board({ chestClaimedAt: '2026-10-29T10:00:00.000Z' });
    expect(result.chest.claimed).toBe(true);
    expect(result.chest.claimedAt).toBe('2026-10-29T10:00:00.000Z');
  });

  it('counts the days remaining in the score week', () => {
    expect(board({ todayKey: '2026-10-24' }).daysRemaining).toBe(7);
    expect(board({ todayKey: '2026-10-30' }).daysRemaining).toBe(1);
    expect(board({ todayKey: '2026-10-31' }).daysRemaining).toBe(0);
    expect(board({ todayKey: '2026-11-05' }).daysRemaining).toBe(0);
  });

  it('exposes every quest key in the summary count', () => {
    expect(board().summary.totalCount).toBe(QUEST_KEYS.length);
  });
});
