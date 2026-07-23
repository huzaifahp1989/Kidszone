export type RecordingCategory = 'quran' | 'nasheed' | 'story' | 'hadith' | string;

export function getRecordingCategoryLabel(
  category?: string | null,
  storyTitle?: string | null
): string {
  if (storyTitle) return 'Story';
  switch (category) {
    case 'quran':
      return "Qur'an";
    case 'nasheed':
      return 'Nasheed';
    case 'story':
      return 'Story';
    case 'hadith':
      return 'Hadith';
    default:
      return category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Recording';
  }
}

export function getRecordingCategoryEmoji(category?: string | null, storyTitle?: string | null): string {
  if (storyTitle) return '📚';
  switch (category) {
    case 'quran':
      return '📖';
    case 'nasheed':
      return '🎵';
    case 'story':
      return '📚';
    case 'hadith':
      return '📜';
    default:
      return '🎙️';
  }
}

export type RecordingStatus = 'submitted' | 'approved' | 'rejected';

export function getRecordingStatusLabel(status: RecordingStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Pending review';
  }
}

export function getRecordingStatusColor(status: RecordingStatus): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-amber-100 text-amber-800 border-amber-200';
  }
}

export function getRecordingAdminFeedback(recording: {
  admin_notes?: string | null;
  admin_feedback?: string | null;
}): string | null {
  const notes = recording.admin_notes?.trim();
  if (notes) return notes;
  const feedback = recording.admin_feedback?.trim();
  return feedback || null;
}
