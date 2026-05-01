import { NextResponse } from 'next/server';
import { applyReferralJoin } from '@/lib/referral-tokens';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body?.userId as string | undefined;
    const referralCode = body?.referralCode as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!referralCode) {
      return NextResponse.json({ error: 'referralCode is required' }, { status: 400 });
    }

    const result = await applyReferralJoin(userId, referralCode);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
