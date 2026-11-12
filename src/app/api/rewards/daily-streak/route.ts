import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  claimDailyStreak,
  getDailyStreakSnapshot,
  type DailyStreakAction,
} from '@/lib/daily-streak';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snapshot = await getDailyStreakSnapshot(user.id);
    return NextResponse.json({ ok: true, ...snapshot });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[rewards/daily-streak GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action: DailyStreakAction = body?.action === 'repair' ? 'repair' : 'claim';

    const result = await claimDailyStreak(user.id, action);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[rewards/daily-streak POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
