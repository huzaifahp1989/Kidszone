import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { recordPushOpen } from '@/lib/push-campaigns';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const campaignId = String(body?.campaignId || '').trim() || null;
    const onesignalNotificationId =
      String(body?.onesignalNotificationId || body?.notificationId || '').trim() || null;
    const subscriptionId =
      String(body?.subscriptionId || body?.deviceId || body?.viewerId || '').trim() || null;
    const source = String(body?.source || 'client').trim() || 'client';

    const authUser = await getAuthenticatedRequestUser(request);
    const userId =
      String(body?.userId || '').trim() || (authUser?.id ? String(authUser.id) : null);

    const result = await recordPushOpen({
      campaignId,
      onesignalNotificationId,
      userId,
      subscriptionId,
      source,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Could not record open' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, campaignId: result.campaignId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record open';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
