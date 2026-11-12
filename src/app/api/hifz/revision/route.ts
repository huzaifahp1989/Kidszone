import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  completeRevision,
  getDueRevisions,
  isKnownHifzSurah,
  syncMemorisedSurahs,
} from '@/lib/hifz-revision-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const overview = await getDueRevisions(user.id);
    if (!overview.available) return NextResponse.json({ available: false });

    return NextResponse.json({
      available: true,
      schedule: overview.rows,
      due: overview.due,
      summary: overview.summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load revision schedule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim();

    if (action === 'sync') {
      const sync = await syncMemorisedSurahs(user.id);
      if (!sync.available) return NextResponse.json({ available: false });

      const overview = await getDueRevisions(user.id);
      return NextResponse.json({
        available: true,
        inserted: sync.inserted,
        schedule: overview.rows,
        due: overview.due,
        summary: overview.summary,
      });
    }

    const surahNumber = Number(body?.surahNumber);
    if (!Number.isFinite(surahNumber) || !isKnownHifzSurah(surahNumber)) {
      return NextResponse.json({ error: 'Invalid surahNumber' }, { status: 400 });
    }

    const remembered = body?.remembered !== false;
    const result = await completeRevision({ userId: user.id, surahNumber, remembered });
    if (!result.available) return NextResponse.json({ available: false });

    const overview = await getDueRevisions(user.id);
    return NextResponse.json({
      available: true,
      row: result.row,
      pointsAwarded: result.pointsAwarded,
      profile: result.profile,
      schedule: overview.rows,
      due: overview.due,
      summary: overview.summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save revision';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
