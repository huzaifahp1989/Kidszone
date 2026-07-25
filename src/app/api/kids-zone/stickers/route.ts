import { NextResponse } from 'next/server';
import { getStickerBook, unlockStickersForTriggers } from '@/lib/stickers-server';
import { requireMatchingUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireMatchingUser(request, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;
    const book = await getStickerBook(auth.userId);
    return NextResponse.json({ success: true, ...book });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;
    const triggers = Array.isArray(body?.triggers) ? body.triggers.map(String) : [];
    const result = await unlockStickersForTriggers(auth.userId, triggers);
    return NextResponse.json({
      success: true,
      unlocked: result.newlyUnlockedIds,
      stickers: result.unlocked,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
