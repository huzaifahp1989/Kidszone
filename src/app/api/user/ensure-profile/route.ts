import { NextResponse } from 'next/server';
import { ensureUserRecords } from '@/lib/ensure-user-records';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || '').trim();

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId is required' }, { status: 400 });
    }

    const result = await ensureUserRecords(userId);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Could not ensure user profile.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId: result.userId,
      createdUser: result.createdUser,
      createdPoints: result.createdPoints,
    });
  } catch (err: any) {
    console.error('[ensure-profile] error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}
