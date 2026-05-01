import { NextResponse } from 'next/server';
import { getReferralSnapshot } from '@/lib/referral-tokens';

function getAppUrl(request: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const snapshot = await getReferralSnapshot(userId, getAppUrl(request));
    return NextResponse.json({ success: true, ...snapshot });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
