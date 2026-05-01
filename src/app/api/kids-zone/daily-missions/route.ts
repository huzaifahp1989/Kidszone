import { NextResponse } from 'next/server';
import { getDailyMissionSnapshot } from '@/lib/kids-zone-missions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const snapshot = await getDailyMissionSnapshot(userId);
    return NextResponse.json({ success: true, ...snapshot });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}