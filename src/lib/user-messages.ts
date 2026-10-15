export type UserMessageSource = 'admin_push' | 'admin_message' | 'system';

export function dedupeUserIds(ids: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      (ids || [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );
}

export function buildUserMessageRows(params: {
  userIds: Array<string | null | undefined>;
  title: string;
  body: string;
  url?: string | null;
  source: UserMessageSource;
  sentBy: string;
  campaignId?: string | null;
  createdAt?: string;
}): Array<{
  user_id: string;
  title: string;
  body: string;
  url: string | null;
  source: UserMessageSource;
  sent_by: string;
  campaign_id: string | null;
  read_at: string | null;
  created_at: string;
}> {
  const safeUrl = params.url ? String(params.url).trim() || null : null;
  const createdAt = params.createdAt || new Date().toISOString();

  return dedupeUserIds(params.userIds).map((userId) => ({
    user_id: userId,
    title: String(params.title || '').trim(),
    body: String(params.body || '').trim(),
    url: safeUrl,
    source: params.source,
    sent_by: String(params.sentBy || 'admin').trim() || 'admin',
    campaign_id: params.campaignId ? String(params.campaignId).trim() || null : null,
    read_at: null,
    created_at: createdAt,
  }));
}
