import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { getSpinWheelStatus } from '@/lib/spin-wheel-server';
import { fetchVoucherHistory } from '@/lib/voucher-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authUser = await getAuthenticatedRequestUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  try {
    const [spinStatus, history] = await Promise.all([
      getSpinWheelStatus(authUser.id),
      fetchVoucherHistory(authUser.id).catch(() => []),
    ]);

    const spinPrizes = history.filter(
      (item) =>
        (item.status === 'active' || item.status === 'pending_approval') &&
        /spin wheel/i.test(item.approvalNotes || '')
    );

    const activePrizes = history.filter(
      (item) => item.status === 'active' || item.status === 'pending_approval'
    );

    return NextResponse.json({
      weekStartDate: spinStatus.weekStartDate,
      isWinner: spinStatus.isWinner,
      canSpin: spinStatus.canSpin,
      hasSpun: spinStatus.hasSpun,
      spin: spinStatus.spin,
      showWinnerPopup: spinStatus.isWinner && !spinStatus.hasSpun,
      spinPrizes,
      activePrizes,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load winner status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
