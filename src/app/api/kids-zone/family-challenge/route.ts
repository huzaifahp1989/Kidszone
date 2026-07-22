import { NextResponse } from 'next/server';
import { addFamilyChallengeProgress, getFamilyChallengeForUser } from '@/lib/family-challenge';
import { requireMatchingUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireMatchingUser(request, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;
    const challenge = await getFamilyChallengeForUser(auth.userId);
    return NextResponse.json({ success: true, challenge });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;
    const points = Math.max(0, Math.min(50, Number(body?.points || 0)));
    const challenge = await addFamilyChallengeProgress(auth.userId, points);
    return NextResponse.json({ success: true, challenge });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
