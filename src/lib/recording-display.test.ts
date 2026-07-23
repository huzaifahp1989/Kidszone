import { describe, expect, it } from 'vitest';
import {
  getRecordingAdminFeedback,
  getRecordingCategoryLabel,
  getRecordingStatusLabel,
} from '@/lib/recording-display';

describe('recording-display', () => {
  it('labels categories for studio recordings', () => {
    expect(getRecordingCategoryLabel('quran')).toBe("Qur'an");
    expect(getRecordingCategoryLabel('nasheed')).toBe('Nasheed');
    expect(getRecordingCategoryLabel('hadith')).toBe('Hadith');
    expect(getRecordingCategoryLabel(null, 'Prophet Musa')).toBe('Story');
  });

  it('maps status to kid-friendly labels', () => {
    expect(getRecordingStatusLabel('submitted')).toBe('Pending review');
    expect(getRecordingStatusLabel('approved')).toBe('Approved');
    expect(getRecordingStatusLabel('rejected')).toBe('Rejected');
  });

  it('prefers admin_notes over admin_feedback', () => {
    expect(
      getRecordingAdminFeedback({
        admin_notes: 'Great job',
        admin_feedback: 'Other',
      })
    ).toBe('Great job');
  });
});
