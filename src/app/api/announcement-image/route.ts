import { NextResponse } from 'next/server';
import { getReadableObjectUrl } from '@/lib/object-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path')?.replace(/^\/+/, '') || '';
  if (!path.startsWith('announcements/')) {
    return NextResponse.json({ error: 'Invalid announcement image path' }, { status: 400 });
  }

  try {
    const readableUrl = await getReadableObjectUrl('voucher-assets', path, 3600);
    return NextResponse.redirect(readableUrl, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json({ error: 'Announcement image not found' }, { status: 404 });
  }
}