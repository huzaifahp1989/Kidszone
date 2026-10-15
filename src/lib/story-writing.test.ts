import { describe, expect, it } from 'vitest';
import {
  ageGroupFromAge,
  approvalNotification,
  assignRanks,
  challengeMatchesAgeGroup,
  clampStoryPoints,
  evaluateStoryBadges,
  moderateStoryText,
  monthRange,
  periodStart,
  previousMonthKey,
  publicDisplayName,
  sanitizeBreakdown,
  validateStory,
  wordCount,
} from './story-writing';

const longStory = 'Once upon a time a kind boy shared his lunch with a hungry friend at the masjid.';

describe('validateStory', () => {
  const base = { title: 'Honest Ali', content: longStory, islamicLesson: 'Always tell the truth.', category: 'honesty', challengeId: null };

  it('accepts a complete story', () => {
    expect(validateStory(base, 'submit')).toEqual([]);
  });
  it('allows drafts with only a title', () => {
    expect(validateStory({ ...base, content: '', islamicLesson: '' }, 'draft')).toEqual([]);
    expect(validateStory({ ...base, content: '', islamicLesson: '' }, 'submit').length).toBeGreaterThan(0);
  });
  it('rejects missing title and bad category', () => {
    expect(validateStory({ ...base, title: ' ' }, 'draft').length).toBe(1);
    expect(validateStory({ ...base, category: 'nope' }, 'draft').length).toBe(1);
  });
});

describe('moderateStoryText', () => {
  it('passes a clean story', () => {
    expect(moderateStoryText('Honest Ali', longStory, 'Tell the truth.')).toEqual([]);
  });
  it('flags phone numbers, emails, addresses and personal info', () => {
    expect(moderateStoryText('call me on 07700 900123')).toContain('phone_number');
    expect(moderateStoryText('mail me at kid@example.com')).toContain('personal_information');
    expect(moderateStoryText('I live at 12 Park Road')).toContain('address');
    expect(moderateStoryText('my school is Greenfield')).toContain('personal_information');
  });
  it('flags bad language, bullying, unsafe and non-Islamic content', () => {
    expect(moderateStoryText('what the shit')).toContain('inappropriate_language');
    expect(moderateStoryText('you are so stupid')).toContain('bullying');
    expect(moderateStoryText('he had a knife')).toContain('unsafe_content');
    expect(moderateStoryText('we celebrated christmas')).toContain('non_islamic_content');
  });
});

describe('points helpers', () => {
  it('clamps points to 0-200', () => {
    expect(clampStoryPoints(-5)).toBe(0);
    expect(clampStoryPoints(25.9)).toBe(25);
    expect(clampStoryPoints(9999)).toBe(200);
    expect(clampStoryPoints('abc')).toBe(0);
  });
  it('sanitizes breakdown keys and de-duplicates', () => {
    expect(sanitizeBreakdown(['creative', 'creative', 'hack', 5])).toEqual(['creative']);
    expect(sanitizeBreakdown('x')).toEqual([]);
  });
  it('uses the exact approval message', () => {
    expect(approvalNotification(25).body).toBe('🎉 Your story has been approved! You earned 25 points.');
  });
});

describe('periods and ranking', () => {
  const now = new Date('2026-10-14T15:00:00Z'); // Wednesday
  it('computes period starts in UTC with Monday weeks', () => {
    expect(periodStart('today', now)?.toISOString()).toBe('2026-10-14T00:00:00.000Z');
    expect(periodStart('week', now)?.toISOString()).toBe('2026-10-12T00:00:00.000Z');
    expect(periodStart('month', now)?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(periodStart('all', now)).toBeNull();
  });
  it('handles month boundaries', () => {
    expect(previousMonthKey(new Date('2026-01-05T00:00:00Z'))).toBe('2025-12');
    expect(monthRange('2026-12').end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
  it('shares ranks for ties', () => {
    const ranked = assignRanks([{ storyPoints: 50 }, { storyPoints: 50 }, { storyPoints: 10 }]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });
});

describe('badges', () => {
  it('awards nothing without approved stories', () => {
    expect(evaluateStoryBadges([])).toEqual([]);
  });
  it('awards count, quality and quran badges', () => {
    const one = evaluateStoryBadges([{ category: 'quran', points: 25, breakdown: ['creative', 'lesson'] }]);
    expect(one).toEqual(expect.arrayContaining(['FIRST_STORY', 'CREATIVE_WRITER', 'EXCELLENT_LESSON', 'QURAN_STORY_WRITER']));
    expect(one).not.toContain('FIVE_STORIES');
    const many = Array.from({ length: 10 }, () => ({ category: null, points: 20, breakdown: [] as never[] }));
    expect(evaluateStoryBadges(many)).toEqual(expect.arrayContaining(['FIVE_STORIES', 'TEN_STORIES', 'STORY_CHAMPION']));
  });
  it('ignores zero-point (reversed) stories', () => {
    expect(evaluateStoryBadges([{ category: null, points: 0, breakdown: [] }])).toEqual([]);
  });
});

describe('misc helpers', () => {
  it('counts words', () => {
    expect(wordCount('  a  b\nc ')).toBe(3);
    expect(wordCount('')).toBe(0);
  });
  it('maps ages and challenge groups', () => {
    expect(ageGroupFromAge(6)).toBe('5-7');
    expect(ageGroupFromAge(9)).toBe('8-10');
    expect(ageGroupFromAge(13)).toBe('11-14');
    expect(ageGroupFromAge(null)).toBe('all');
    expect(challengeMatchesAgeGroup('all', '5-7')).toBe(true);
    expect(challengeMatchesAgeGroup('8-10', '5-7')).toBe(false);
  });
  it('never exposes email or full names publicly', () => {
    expect(publicDisplayName({ username: 'StarKid' })).toBe('StarKid');
    expect(publicDisplayName({ username: 'a@b.com', name: 'Aisha Khan' })).toBe('Aisha');
    expect(publicDisplayName({ name: 'a@b.com' })).toBe('Young Writer');
    expect(publicDisplayName(null)).toBe('Young Writer');
  });
});
