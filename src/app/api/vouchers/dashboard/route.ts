import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  fetchVoucherAnalytics,
  fetchVoucherGallery,
  fetchVoucherHistory,
  fetchVoucherNotifications,
  fetchVoucherOffers,
  isVoucherSetupMissing,
} from '@/lib/voucher-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedRequestUser(request);
    const [offers, gallery, analytics, history, notifications] = await Promise.all([
      fetchVoucherOffers({ includeHidden: false, includeExpired: true }),
      fetchVoucherGallery(),
      fetchVoucherAnalytics(),
      authUser ? fetchVoucherHistory(authUser.id) : Promise.resolve([]),
      fetchVoucherNotifications(authUser?.id),
    ]);

    return NextResponse.json({
      offers,
      gallery,
      analytics,
      history,
      notifications,
      userId: authUser?.id || null,
    });
  } catch (error: any) {
    if (isVoucherSetupMissing(error)) {
      return NextResponse.json({ offers: [], gallery: [], history: [], notifications: [], analytics: null, setupRequired: true }, { status: 503 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to load voucher dashboard' }, { status: 500 });
  }
}