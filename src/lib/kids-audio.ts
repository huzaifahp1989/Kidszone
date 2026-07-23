export const KIDS_AUDIO_CATEGORIES = ['quran', 'nasheed', 'story', 'hadith'] as const;

export type KidsAudioCategory = (typeof KIDS_AUDIO_CATEGORIES)[number];

export const KIDS_AUDIO_CATEGORY_LABELS: Record<KidsAudioCategory, string> = {
  quran: 'Qur’an',
  nasheed: 'Nasheed',
  story: 'Story',
  hadith: 'Hadith',
};

export const KIDS_AUDIO_CATEGORY_EMOJI: Record<KidsAudioCategory, string> = {
  quran: '📖',
  nasheed: '🎵',
  story: '📚',
  hadith: '📜',
};

export const KIDS_AUDIO_LIBRARY_TABLE = 'kids_audio_library';
export const KIDS_AUDIO_BUCKET = 'story-recordings' as const;
export const KIDS_AUDIO_PREFIX = 'kids-audio-library';
export const KIDS_AUDIO_MAX_BYTES = 30 * 1024 * 1024;

export const KIDS_AUDIO_SETUP_SQL = `
ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS child_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.kids_audio_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'story'
    CHECK (category IN ('quran', 'nasheed', 'story', 'hadith')),
  audio_path TEXT NOT NULL,
  audio_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  cover_emoji TEXT DEFAULT '🎧',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS kids_audio_library_published_idx
  ON public.kids_audio_library (is_published, category, sort_order, created_at DESC);

ALTER TABLE public.kids_audio_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published kids audio" ON public.kids_audio_library;
CREATE POLICY "Anyone can view published kids audio"
  ON public.kids_audio_library FOR SELECT
  USING (is_published = true);
`.trim();

export function isKidsAudioCategory(value: unknown): value is KidsAudioCategory {
  return typeof value === 'string' && (KIDS_AUDIO_CATEGORIES as readonly string[]).includes(value);
}

/** Encode category into description when the DB has no category column yet. */
export function withCategoryMarker(category: KidsAudioCategory | null, message: string | null): string | null {
  const body = (message || '').trim();
  if (!category) return body || null;
  return body ? `[cat:${category}]\n${body}` : `[cat:${category}]`;
}

export function stripCategoryMarker(description: string | null | undefined): string | null {
  if (!description) return null;
  const cleaned = description.replace(/^\[cat:(quran|nasheed|story|hadith)\]\s*/i, '').trim();
  return cleaned || null;
}

/**
 * Resolve category from DB column, description marker, or studio audio path
 * (`studio/{user}_{ts}_{category}_{title}.ext`).
 */
export function resolveRecordingCategory(row: {
  category?: string | null;
  description?: string | null;
  audio_path?: string | null;
  story_id?: string | null;
}): KidsAudioCategory | string {
  if (isKidsAudioCategory(row.category)) return row.category;

  const fromDesc = String(row.description || '').match(/^\[cat:(quran|nasheed|story|hadith)\]/i);
  if (fromDesc && isKidsAudioCategory(fromDesc[1].toLowerCase())) {
    return fromDesc[1].toLowerCase() as KidsAudioCategory;
  }

  const path = String(row.audio_path || '');
  const fromPath = path.match(/studio\/[^/]+_\d+_(quran|nasheed|story|hadith)_/i);
  if (fromPath && isKidsAudioCategory(fromPath[1].toLowerCase())) {
    return fromPath[1].toLowerCase() as KidsAudioCategory;
  }

  if (row.story_id) return 'story';
  return 'story';
}

export function isMissingTableError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || error || '').toLowerCase();
  const code = String((error as { code?: string })?.code || '');
  return (
    code === '42P01' ||
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('schema cache')
  );
}

export interface KidsAudioTrack {
  id: string;
  title: string;
  description: string | null;
  category: KidsAudioCategory | string;
  audioUrl: string | null;
  durationSeconds: number;
  coverEmoji: string;
  source: 'library' | 'kids';
  childName?: string | null;
  createdAt?: string | null;
}
