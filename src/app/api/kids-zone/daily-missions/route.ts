import { NextResponse } from 'next/server';
import { getDailyMissionSnapshot } from '@/lib/kids-zone-missions';
import { tryBumpFamilyStreak, getFamilyStreakForUser } from '@/lib/family-streak';
import { requireMatchingUser } from '@/lib/request-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireMatchingUser(request, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;

    const snapshot = await getDailyMissionSnapshot(auth.userId);

    let familyStreak = await getFamilyStreakForUser(auth.userId);
    if (snapshot.summary.allCompleted) {
      const bumped = await tryBumpFamilyStreak(auth.userId, snapshot.date);
      if (bumped) familyStreak = bumped;
    }

    return NextResponse.json({ success: true, ...snapshot, familyStreak });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}