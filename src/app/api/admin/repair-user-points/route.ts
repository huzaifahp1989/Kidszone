import { NextResponse } from 'next/server';
import { repairUserPointsByEmail, repairUserPointsByUserId } from '@/lib/points-repair';

export const dynamic = 'force-dynamic';

function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  return Boolean(secret && authHeader === `Bearer ${secret}`);
}

export async function POST(req: Request) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim();
    const userId = String(body?.userId || '').trim();
    const backfillToday = body?.backfillToday !== false;

    if (!email && !userId) {
      return NextResponse.json({ error: 'email or userId is required' }, { status: 400 });
    }

    const result = email
      ? await repairUserPointsByEmail(email, { backfillToday })
      : await repairUserPointsByUserId(userId, { backfillToday });

    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[admin/repair-user-points] error:', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
