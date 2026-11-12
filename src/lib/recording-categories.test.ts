import { describe, expect, it } from 'vitest';
import {
  RECORDING_CATEGORIES,
  RECORDING_CATEGORY_SLUGS,
  RECORDING_STATUSES,
  USER_SAVEABLE_STATUSES,
  getRecordingCategoryEmoji,
  getRecordingCategoryLabel,
  getRecordingCategoryMeta,
  getRecordingStatusMeta,
  isEditableStatus,
  isRecordingCategory,
  isRecordingStatus,
} from '@/lib/recording-categories';

describe('recording-categories', () => {
  it('exposes the six requested categories with unique slugs', () => {
    expect(RECORDING_CATEGORIES).toHaveLength(6);
    const slugs = RECORDING_CATEGORIES.map((category) => category.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(RECORDING_CATEGORY_SLUGS).toEqual(slugs);
  });

  it('labels and emojis every category, with a fallback', () => {
    for (const category of RECORDING_CATEGORIES) {
      expect(getRecordingCategoryLabel(category.slug)).toBe(category.label);
      expect(getRecordingCategoryEmoji(category.slug)).toBe(category.emoji);
      expect(getRecordingCategoryMeta(category.slug)).toEqual(category);
    }
    expect(getRecordingCategoryLabel('nope')).toBe('Recording');
    expect(getRecordingCategoryEmoji(undefined)).toBe('🎙️');
  });

  it('guards category values coming from client input', () => {
    expect(isRecordingCategory('quran')).toBe(true);
    expect(isRecordingCategory('general_audio')).toBe(true);
    expect(isRecordingCategory('nope')).toBe(false);
    expect(isRecordingCategory('')).toBe(false);
    expect(isRecordingCategory(null)).toBe(false);
    expect(isRecordingCategory(42)).toBe(false);
  });

  it('guards recording statuses and only lets users save private states', () => {
    expect(RECORDING_STATUSES).toEqual(['draft', 'saved', 'submitted', 'approved', 'rejected']);
    expect(USER_SAVEABLE_STATUSES).toEqual(['draft', 'saved', 'submitted']);

    expect(isRecordingStatus('draft')).toBe(true);
    expect(isRecordingStatus('approved')).toBe(true);
    expect(isRecordingStatus('published')).toBe(false);
    expect(isRecordingStatus(null)).toBe(false);
  });

  it('allows editing only before a recording has been reviewed', () => {
    expect(isEditableStatus('draft')).toBe(true);
    expect(isEditableStatus('saved')).toBe(true);
    expect(isEditableStatus('submitted')).toBe(true);
    expect(isEditableStatus('approved')).toBe(false);
    expect(isEditableStatus('rejected')).toBe(false);
    expect(isEditableStatus(undefined)).toBe(false);
  });

  it('returns readable status metadata with a pending fallback', () => {
    expect(getRecordingStatusMeta('draft')).toEqual({ label: 'Draft', tone: 'neutral' });
    expect(getRecordingStatusMeta('approved').tone).toBe('good');
    expect(getRecordingStatusMeta('nope').label).toBe('Pending review');
    expect(getRecordingStatusMeta(null).tone).toBe('pending');
  });
});
