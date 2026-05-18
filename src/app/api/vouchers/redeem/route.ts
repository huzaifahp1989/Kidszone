import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { isVoucherSetupMissing, redeemVoucher } from '@/lib/voucher-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedRequestUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Please sign in to redeem vouchers.' }, { status: 401 });
    }

    const body = await request.json();
    const voucherId = String(body?.voucherId || '');
    const deviceFingerprint = typeof body?.deviceFingerprint === 'string' ? body.deviceFingerprint : null;
    const shareUrl = typeof body?.shareUrl === 'string' ? body.shareUrl : null;

    if (!voucherId) {
      return NextResponse.json({ error: 'voucherId is required' }, { status: 400 });
    }

    const redemption = await redeemVoucher({
      voucherId,
      userId: authUser.id,
      userEmail: authUser.email,
      deviceFingerprint,
      shareUrl,
    });

    return NextResponse.json({ redemption });
  } catch (error: any) {
    if (isVoucherSetupMissing(error)) {
      return NextResponse.json({ error: 'Voucher system setup is missing. Run VOUCHER_REWARDS_SYSTEM_SETUP.sql.', setupRequired: true }, { status: 503 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to redeem voucher' }, { status: Number(error?.status || 500) });
  }
}