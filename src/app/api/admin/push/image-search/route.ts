import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type OpenverseResult = {
  id?: string;
  title?: string;
  url?: string;
  thumbnail?: string;
  foreign_landing_url?: string;
  creator?: string | null;
  license?: string;
};

/**
 * Free Creative Commons image search via Openverse (no API key required).
 */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get('q') || '').trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
  }

  try {
    const url = new URL('https://api.openverse.org/v1/images/');
    url.searchParams.set('q', q);
    url.searchParams.set('page_size', '16');
    url.searchParams.set('license_type', 'commercial,modification');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'IslamicKidsLearningPlatform/1.0' },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Image search failed (${res.status})`, detail: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { results?: OpenverseResult[] };
    const images = (data.results || [])
      .map((row) => {
        const full = String(row.url || '').trim();
        const thumb = String(row.thumbnail || row.url || '').trim();
        if (!full && !thumb) return null;
        return {
          id: String(row.id || full),
          title: String(row.title || 'Untitled').slice(0, 120),
          url: full || thumb,
          thumbnail: thumb || full,
          creator: row.creator ? String(row.creator) : null,
          license: row.license ? String(row.license) : null,
          sourceUrl: row.foreign_landing_url ? String(row.foreign_landing_url) : null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ q, images, count: images.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Image search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
