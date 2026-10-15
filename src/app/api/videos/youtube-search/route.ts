import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  VIDEO_CATEGORIES,
  normalizeVideoCategory,
  youtubeThumbnailUrl,
  type VideoCategory,
} from '@/lib/video-categories';
import {
  buildKidsIslamicSearchQuery,
  youtubeSearchPageUrl,
  youtubeWatchUrl,
} from '@/lib/youtube';

export const dynamic = 'force-dynamic';

type YtSearchItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail_url: string | null;
  watch_url: string;
  alreadyInChannel: boolean;
};

function getYouTubeApiKey() {
  return (
    process.env.YOUTUBE_API_KEY ||
    process.env.GOOGLE_YOUTUBE_API_KEY ||
    process.env.YOUTUBE_DATA_API_KEY ||
    ''
  ).trim();
}

async function searchYouTubeApi(query: string, maxResults = 12): Promise<YtSearchItem[]> {
  const key = getYouTubeApiKey();
  if (!key) return [];

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(Math.max(1, Math.min(20, maxResults))));
  url.searchParams.set('q', query);
  url.searchParams.set('safeSearch', 'strict');
  url.searchParams.set('relevanceLanguage', 'en');
  url.searchParams.set('key', key);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`YouTube search failed (${res.status}): ${text.slice(0, 180)}`);
  }

  const json = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
      };
    }>;
  };

  return (json.items || [])
    .map((item) => {
      const videoId = String(item.id?.videoId || '').trim();
      if (!videoId) return null;
      return {
        videoId,
        title: String(item.snippet?.title || 'YouTube video'),
        channelTitle: String(item.snippet?.channelTitle || ''),
        thumbnail_url:
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          youtubeThumbnailUrl(videoId),
        watch_url: youtubeWatchUrl(videoId),
        alreadyInChannel: false,
      } satisfies YtSearchItem;
    })
    .filter(Boolean) as YtSearchItem[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get('q') || '').trim();
    const rawCategory = String(searchParams.get('category') || 'all').trim().toLowerCase();
    const category: VideoCategory | 'all' =
      rawCategory === 'all' || !(VIDEO_CATEGORIES as readonly string[]).includes(rawCategory)
        ? 'all'
        : (rawCategory as VideoCategory);

    const searchQuery = buildKidsIslamicSearchQuery(category, q);

    // Library matches first
    let libraryQuery = supabaseAdmin
      .from('learning_videos')
      .select('id, title, description, category, youtube_video_id, thumbnail_url, points_reward, video_url')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(40);

    if (category !== 'all') {
      libraryQuery = libraryQuery.eq('category', normalizeVideoCategory(category));
    }

    const { data: libraryRows, error: libraryError } = await libraryQuery;
    if (libraryError) throw libraryError;

    const qLower = q.toLowerCase();
    const library = (libraryRows || [])
      .map((row) => {
        const youtube_video_id = row.youtube_video_id ? String(row.youtube_video_id) : null;
        return {
          id: String(row.id),
          title: String(row.title || ''),
          description: String(row.description || ''),
          category: normalizeVideoCategory(row.category),
          youtube_video_id,
          thumbnail_url: row.thumbnail_url
            ? String(row.thumbnail_url)
            : youtubeThumbnailUrl(youtube_video_id),
          points_reward: Number(row.points_reward ?? 25),
          video_url: String(row.video_url || ''),
        };
      })
      .filter((row) => {
        if (!qLower) return true;
        return (
          row.title.toLowerCase().includes(qLower) ||
          row.description.toLowerCase().includes(qLower) ||
          row.category.includes(qLower)
        );
      });

    const libraryIds = new Set(
      library.map((v) => v.youtube_video_id).filter(Boolean) as string[]
    );

    let youtube: YtSearchItem[] = [];
    let youtubeSource: 'api' | 'suggestions' = 'suggestions';
    let youtubeError: string | null = null;

    try {
      const apiHits = await searchYouTubeApi(searchQuery, 12);
      if (apiHits.length) {
        youtube = apiHits.map((item) => ({
          ...item,
          alreadyInChannel: libraryIds.has(item.videoId),
        }));
        youtubeSource = 'api';
      }
    } catch (err) {
      youtubeError = err instanceof Error ? err.message : 'YouTube API error';
    }

    // Curated suggestion cards when API key missing / empty
    if (!youtube.length) {
      const suggestionQueries =
        category === 'all'
          ? [
              'islamic kids quran',
              'islamic kids nasheed',
              'prophet stories for kids',
              'hadith for children',
            ]
          : [searchQuery];

      youtube = suggestionQueries.map((query, idx) => ({
        videoId: `suggest-${idx}`,
        title: query,
        channelTitle: 'Search YouTube',
        thumbnail_url: null,
        watch_url: youtubeSearchPageUrl(query),
        alreadyInChannel: false,
      }));
      youtubeSource = 'suggestions';
    }

    return NextResponse.json({
      ok: true,
      query: searchQuery,
      category,
      library,
      youtube,
      youtubeSource,
      youtubeError,
      youtubeSearchUrl: youtubeSearchPageUrl(searchQuery),
      hasYouTubeApiKey: Boolean(getYouTubeApiKey()),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
