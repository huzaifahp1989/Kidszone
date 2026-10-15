import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';
import { ensureCompetitionCycle } from '@/lib/story-writing-server';

export const dynamic = 'force-dynamic';

/** Creates the new month's Story Writing competition and finalizes the finished one. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const month = await ensureCompetitionCycle();
    return NextResponse.json({ ok: true, month });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
