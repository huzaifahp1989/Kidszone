import { NextResponse } from 'next/server';
import { getFamilyStreakForUser } from '@/lib/family-streak';
import { requireMatchingUser } from '@/lib/request-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireMatchingUser(request, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;

    const streak = await getFamilyStreakForUser(auth.userId);
    return NextResponse.json({ success: true, streak });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
