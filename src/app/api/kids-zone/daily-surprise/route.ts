import { NextResponse } from 'next/server';
import { claimDailySurprise, getDailySurpriseSnapshot } from '@/lib/daily-surprise';
import { requireMatchingUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireMatchingUser(request, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;
    const snapshot = await getDailySurpriseSnapshot(auth.userId);
    return NextResponse.json({ success: true, ...snapshot });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;
    const result = await claimDailySurprise(auth.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
