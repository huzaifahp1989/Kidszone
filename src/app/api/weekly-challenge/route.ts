import { NextResponse } from 'next/server';
import { getWeeklyChallengeSnapshot } from '@/lib/weekly-challenge-themes';
import { requireMatchingUser } from '@/lib/request-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireMatchingUser(request, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;

    const challenge = await getWeeklyChallengeSnapshot(auth.userId);
    return NextResponse.json({ success: true, challenge });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
