import type { VideoCategory } from '@/lib/video-categories';

export function parseYouTubeVideoId(input: string): string | null {
  const value = String(input || '').trim();
  if (!value) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0] || '';
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (url.hostname.includes('youtube.com')) {
      const fromQuery = url.searchParams.get('v') || '';
      if (/^[a-zA-Z0-9_-]{11}$/.test(fromQuery)) return fromQuery;

      const segments = url.pathname.split('/').filter(Boolean);
      const embedIdx = segments.findIndex((seg) => seg === 'embed' || seg === 'shorts');
      if (embedIdx >= 0) {
        const id = segments[embedIdx + 1] || '';
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeThumbnailUrl(videoId: string | null | undefined): string | null {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeSearchPageUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Kid-safe default search queries by Kids Channel category. */
export const YOUTUBE_CATEGORY_SEARCH: Record<VideoCategory, string> = {
  quran: 'islamic kids quran recitation for children',
  nasheed: 'islamic kids nasheed songs for children',
  story: 'islamic stories for kids prophets',
  hadith: 'hadith for kids islamic stories',
  other: 'islamic kids cartoon educational',
};

export function buildKidsIslamicSearchQuery(category: VideoCategory | 'all', freeText?: string) {
  const extra = String(freeText || '').trim();
  if (category === 'all') {
    return extra
      ? `${extra} islamic kids`
      : 'islamic kids quran nasheed stories';
  }
  const base = YOUTUBE_CATEGORY_SEARCH[category];
  return extra ? `${extra} ${base}` : base;
}

export type YouTubeOEmbed = {
  title: string;
  author_name?: string;
};

export async function fetchYouTubeOEmbed(videoId: string): Promise<YouTubeOEmbed | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeWatchUrl(videoId))}&format=json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    if (!data.title) return null;
    return { title: String(data.title), author_name: data.author_name ? String(data.author_name) : undefined };
  } catch {
    return null;
  }
}

export function splitYouTubeUrlLines(raw: string): string[] {
  return String(raw || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
