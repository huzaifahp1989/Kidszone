import { supabaseAdmin } from '@/lib/supabase-admin';
import type { OneSignalMultiAppResult } from '@/lib/onesignal-server';

export type PushCampaignRecord = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  audience: string;
  target_user_id: string | null;
  recipients: number;
  opens: number;
  onesignal_ids: string[] | null;
  strategy: string | null;
  per_app: unknown;
  created_at: string;
};

export async function createPushCampaign(input: {
  title: string;
  body: string;
  url?: string;
  audience: string;
  targetUserId?: string;
}): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('push_campaigns')
    .insert({
      title: input.title,
      body: input.body,
      url: input.url || null,
      audience: input.audience,
      target_user_id: input.targetUserId || null,
      recipients: 0,
      opens: 0,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[push-campaigns] create failed (run SETUP_PUSH_CAMPAIGN_TRACKING.sql?):', error.message);
    return null;
  }
  return data?.id ? String(data.id) : null;
}

export async function finalizePushCampaign(
  campaignId: string,
  result: OneSignalMultiAppResult
): Promise<void> {
  const onesignalIds = result.perApp
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id));

  const { error } = await supabaseAdmin
    .from('push_campaigns')
    .update({
      recipients: result.recipients,
      onesignal_ids: onesignalIds,
      strategy: result.strategy || null,
      per_app: result.perApp,
    })
    .eq('id', campaignId);

  if (error) {
    console.warn('[push-campaigns] finalize failed:', error.message);
  }
}

async function refreshCampaignOpens(campaignId: string) {
  const { count } = await supabaseAdmin
    .from('push_opens')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  await supabaseAdmin
    .from('push_campaigns')
    .update({ opens: count || 0 })
    .eq('id', campaignId);
}

export async function recordPushOpen(input: {
  campaignId?: string | null;
  onesignalNotificationId?: string | null;
  userId?: string | null;
  subscriptionId?: string | null;
  source?: string;
}): Promise<{ ok: boolean; campaignId?: string; error?: string }> {
  let campaignId = String(input.campaignId || '').trim() || null;
  const onesignalId = String(input.onesignalNotificationId || '').trim() || null;
  const userId = String(input.userId || '').trim() || null;
  const subscriptionId = String(input.subscriptionId || '').trim() || null;
  const source = String(input.source || 'client').trim() || 'client';

  if (!campaignId && onesignalId) {
    const { data } = await supabaseAdmin
      .from('push_campaigns')
      .select('id')
      .contains('onesignal_ids', [onesignalId])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    campaignId = data?.id ? String(data.id) : null;
  }

  if (!campaignId) {
    return { ok: false, error: 'Missing campaign id' };
  }

  if (!userId && !subscriptionId) {
    return { ok: false, error: 'Need userId or subscriptionId' };
  }

  // Deduplicate: if this user already opened this campaign, treat as success
  if (userId) {
    const existing = await supabaseAdmin
      .from('push_opens')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existing.data?.id) {
      return { ok: true, campaignId };
    }
  } else if (subscriptionId) {
    const existing = await supabaseAdmin
      .from('push_opens')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('subscription_id', subscriptionId)
      .maybeSingle();
    if (existing.data?.id) {
      return { ok: true, campaignId };
    }
  }

  const { error } = await supabaseAdmin.from('push_opens').insert({
    campaign_id: campaignId,
    onesignal_notification_id: onesignalId,
    user_id: userId,
    subscription_id: subscriptionId,
    source,
  });

  if (error && !/duplicate|unique/i.test(error.message || '')) {
    return { ok: false, campaignId, error: error.message };
  }

  await refreshCampaignOpens(campaignId);
  return { ok: true, campaignId };
}

export async function listPushCampaigns(limit = 30): Promise<PushCampaignRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('push_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[push-campaigns] list failed:', error.message);
    return [];
  }

  const rows = (data || []) as PushCampaignRecord[];

  // Keep opens fresh from push_opens (in case denormalized column got out of sync)
  await Promise.all(
    rows.slice(0, 15).map(async (row) => {
      try {
        const { count } = await supabaseAdmin
          .from('push_opens')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', row.id);
        const opens = count || 0;
        if (opens !== Number(row.opens || 0)) {
          row.opens = opens;
          void supabaseAdmin.from('push_campaigns').update({ opens }).eq('id', row.id);
        }
      } catch {
        /* ignore */
      }
    })
  );

  return rows;
}
