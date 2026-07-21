import { NextResponse } from 'next/server';
import { recordPushOpen } from '@/lib/push-campaigns';

export const dynamic = 'force-dynamic';

/**
 * OneSignal event webhook (optional).
 * In OneSignal → Settings → Webhooks / Event Streams, point clicked/opened events here.
 * Body shapes vary; we accept common notification.clicked payloads.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const event = body?.event || body?.event_kind || body?.type || '';
    const eventName = String(event).toLowerCase();

    // Accept click/open-ish events; ignore others quietly
    if (eventName && !/click|open|opened|notification\.clicked/i.test(eventName)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const data = body?.data || body?.notification?.data || body?.custom_data || {};
    const campaignId =
      String(data?.campaignId || data?.campaign_id || body?.campaignId || '').trim() || null;
    const onesignalNotificationId =
      String(
        body?.notification_id ||
          body?.notification?.id ||
          body?.id ||
          body?.message_id ||
          ''
      ).trim() || null;
    const subscriptionId =
      String(
        body?.subscription_id ||
          body?.player_id ||
          body?.subscription?.id ||
          body?.user?.subscription_id ||
          ''
      ).trim() || null;
    const userId =
      String(
        body?.external_id ||
          body?.user?.external_id ||
          data?.external_id ||
          body?.aliases?.external_id ||
          ''
      ).trim() || null;

    if (!campaignId && !onesignalNotificationId) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'no campaign/notification id' });
    }

    const result = await recordPushOpen({
      campaignId,
      onesignalNotificationId,
      userId,
      subscriptionId,
      source: 'webhook',
    });

    return NextResponse.json({ ok: result.ok, campaignId: result.campaignId, error: result.error });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
