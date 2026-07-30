import { NextResponse } from 'next/server';
import { runPointsRepairBatch } from '@/lib/points-repair';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  const xAdmin = req.headers.get('x-admin-auth') === 'true';
  return xAdmin || Boolean(secret && authHeader === `Bearer ${secret}`);
}

export async function POST(req: Request) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runPointsRepairBatch({ triggerSource: 'admin' });
    return NextResponse.json({
      success: true,
      ...summary,
      details: summary.details.slice(0, 100),
    });
  } catch (error: any) {
    console.error('[admin/repair-points]', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
