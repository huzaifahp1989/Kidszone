import { NextResponse } from 'next/server';
import { getAvatarState, setAvatarLoadout, unlockAvatarItem } from '@/lib/avatar-server';
import { requireMatchingUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireMatchingUser(request, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;
    const state = await getAvatarState(auth.userId);
    return NextResponse.json({ success: true, ...state });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const action = String(body?.action || 'unlock');
    if (action === 'equip') {
      const state = await setAvatarLoadout(auth.userId, body?.loadout || {});
      return NextResponse.json({ success: true, ...state });
    }

    const result = await unlockAvatarItem(auth.userId, String(body?.itemId || ''));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
