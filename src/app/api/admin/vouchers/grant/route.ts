import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { grantVoucherToUser, isVoucherSetupMissing } from '@/lib/voucher-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const voucherId = String(body?.voucherId || '');
    const userId = String(body?.userId || '');
    const notes = typeof body?.notes === 'string' ? body.notes : '';

    if (!voucherId || !userId) {
      return NextResponse.json({ error: 'voucherId and userId are required' }, { status: 400 });
    }

    const redemption = await grantVoucherToUser({ voucherId, userId, notes });
    return NextResponse.json({ redemption });
  } catch (error: any) {
    if (isVoucherSetupMissing(error)) {
      return NextResponse.json({ error: 'Voucher tables are missing. Run VOUCHER_REWARDS_SYSTEM_SETUP.sql.', setupRequired: true }, { status: 503 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to grant voucher' }, { status: 500 });
  }
}
