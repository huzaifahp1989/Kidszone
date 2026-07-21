import { NextResponse } from 'next/server';
import { claimShareReward } from '@/lib/referral-tokens';
import { requireMatchingUser } from '@/lib/request-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const result = await claimShareReward(auth.userId);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
