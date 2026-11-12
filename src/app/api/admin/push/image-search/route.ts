import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type CommonsImageInfo = {
  url?: string;
  thumburl?: string;
  descriptionurl?: string;
  extmetadata?: Record<string, { value?: string }>;
};

type CommonsPage = {
  pageid?: number;
  title?: string;
  imageinfo?: CommonsImageInfo[];
};

function stripHtml(value?: string | null): string | null {
  if (!value) return null;
  const text = String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

/**
 * Free Creative Commons image search.
 *
 * Uses Wikimedia Commons (no API key, stable) — the previous Openverse endpoint now
 * requires credentials and left the request hanging until the route timed out.
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
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('format', 'json');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrsearch', `filetype:bitmap ${q}`);
    url.searchParams.set('gsrnamespace', '6');
    url.searchParams.set('gsrlimit', '16');
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|extmetadata');
    url.searchParams.set('iiurlwidth', '800');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'IslamicKidsLearningPlatform/1.0 (admin push image search)',
      },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Image search failed (${res.status})`, detail: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } };
    const pages = Object.values(data.query?.pages || {});

    const images = pages
      .map((page) => {
        const info = page.imageinfo?.[0];
        const full = String(info?.url || '').trim();
        const thumb = String(info?.thumburl || full).trim();
        if (!thumb && !full) return null;
        const meta = info?.extmetadata || {};
        return {
          id: String(page.pageid ?? thumb),
          title: String(page.title || 'Untitled').replace(/^File:/, '').slice(0, 120),
          // 800px thumb keeps rich notifications light while staying sharp on mobile.
          url: thumb || full,
          thumbnail: thumb || full,
          creator: stripHtml(meta.Artist?.value),
          license: stripHtml(meta.LicenseShortName?.value),
          sourceUrl: info?.descriptionurl ? String(info.descriptionurl) : null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ q, images, count: images.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Image search failed';
    const timedOut = /abort|timeout/i.test(message);
    return NextResponse.json(
      { error: timedOut ? 'Image search timed out — try again.' : message },
      { status: timedOut ? 504 : 500 }
    );
  }
}
