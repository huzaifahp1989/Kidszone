import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { claimWeeklyChest, claimWeeklyQuest, getWeeklyQuestBoard } from '@/lib/weekly-quests';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const board = await getWeeklyQuestBoard(user.id);
    return NextResponse.json({ ok: true, board });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[quests/weekly GET]', message);
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
    const result =
      body?.chest === true
        ? await claimWeeklyChest(user.id)
        : await claimWeeklyQuest(user.id, String(body?.questKey || ''));

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[quests/weekly POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
