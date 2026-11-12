/**
 * Recording categories and statuses — single source of truth shared by the
 * studio, the user's recording library, the API routes and the admin review area.
 *
 * The `recordings.category` column is plain TEXT, so these slugs are validated on
 * the server against this allowlist before anything is written.
 */

export const RECORDING_CATEGORIES = [
  { slug: 'quran', label: "Qur'an Recitation", emoji: '📖' },
  { slug: 'nasheed', label: 'Nasheed', emoji: '🎵' },
  { slug: 'islamic_reminder', label: 'Islamic Reminder', emoji: '💡' },
  { slug: 'hadith', label: 'Hadith', emoji: '📜' },
  { slug: 'story', label: 'Islamic Storytelling', emoji: '📚' },
  { slug: 'general_audio', label: 'General Audio', emoji: '🎙️' },
] as const;

export type RecordingCategory = (typeof RECORDING_CATEGORIES)[number]['slug'];

export const RECORDING_CATEGORY_SLUGS: RecordingCategory[] = RECORDING_CATEGORIES.map((c) => c.slug);

const CATEGORY_BY_SLUG = new Map<string, (typeof RECORDING_CATEGORIES)[number]>(
  RECORDING_CATEGORIES.map((c) => [c.slug, c])
);

export function isRecordingCategory(value: unknown): value is RecordingCategory {
  return typeof value === 'string' && CATEGORY_BY_SLUG.has(value);
}

export function getRecordingCategoryMeta(slug?: string | null) {
  return (slug && CATEGORY_BY_SLUG.get(slug)) || undefined;
}

export function getRecordingCategoryLabel(slug?: string | null): string {
  return getRecordingCategoryMeta(slug)?.label || 'Recording';
}

export function getRecordingCategoryEmoji(slug?: string | null): string {
  return getRecordingCategoryMeta(slug)?.emoji || '🎙️';
}

/**
 * Recording lifecycle. `draft` and `saved` are private to the child; `submitted`
 * is waiting for a teacher to review; `approved`/`rejected` are reviewed states.
 */
export const RECORDING_STATUSES = [
  'draft',
  'saved',
  'submitted',
  'approved',
  'rejected',
] as const;

export type RecordingStatus = (typeof RECORDING_STATUSES)[number];

/** Statuses a child is allowed to create/save directly from the studio. */
export const USER_SAVEABLE_STATUSES: RecordingStatus[] = ['draft', 'saved', 'submitted'];

export function isRecordingStatus(value: unknown): value is RecordingStatus {
  return typeof value === 'string' && (RECORDING_STATUSES as readonly string[]).includes(value);
}

const STATUS_META: Record<RecordingStatus, { label: string; tone: 'neutral' | 'pending' | 'good' | 'bad' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  saved: { label: 'Saved', tone: 'neutral' },
  submitted: { label: 'Pending review', tone: 'pending' },
  approved: { label: 'Approved', tone: 'good' },
  rejected: { label: 'Rejected', tone: 'bad' },
};

export function getRecordingStatusMeta(status?: string | null) {
  if (status && status in STATUS_META) return STATUS_META[status as RecordingStatus];
  return { label: 'Pending review', tone: 'pending' as const };
}

/** A recording the child can still freely edit/delete (not yet reviewed). */
export function isEditableStatus(status?: string | null): boolean {
  return status === 'draft' || status === 'saved' || status === 'submitted';
}
