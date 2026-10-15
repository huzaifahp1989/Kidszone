export const VIDEO_CATEGORIES = ['quran', 'nasheed', 'story', 'hadith', 'other'] as const;

export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export const VIDEO_CATEGORY_META: Record<
  VideoCategory,
  { label: string; emoji: string; blurb: string }
> = {
  quran: { label: 'Quran', emoji: '📖', blurb: 'Recitation & tajweed for kids' },
  nasheed: { label: 'Nasheeds', emoji: '🎵', blurb: 'Islamic songs kids love' },
  story: { label: 'Stories', emoji: '📚', blurb: 'Prophets & manners stories' },
  hadith: { label: 'Hadith', emoji: '📜', blurb: 'Short hadith lessons' },
  other: { label: 'More', emoji: '✨', blurb: 'Other Islamic kids videos' },
};

export function normalizeVideoCategory(value: unknown): VideoCategory {
  const key = String(value || '')
    .trim()
    .toLowerCase();
  if ((VIDEO_CATEGORIES as readonly string[]).includes(key)) {
    return key as VideoCategory;
  }
  return 'other';
}

export function youtubeThumbnailUrl(videoId: string | null | undefined): string | null {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

