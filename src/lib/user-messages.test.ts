import { describe, expect, it } from 'vitest';
import { buildUserMessageRows, dedupeUserIds } from '@/lib/user-messages';

describe('user message helpers', () => {
  it('deduplicates recipients while keeping the all-user target', () => {
    expect(dedupeUserIds(['u1', 'u2', 'u1', ''])).toEqual(['u1', 'u2']);
  });

  it('builds a message row for each target user', () => {
    const rows = buildUserMessageRows({
      userIds: ['u1', 'u2'],
      title: 'Important update',
      body: 'Please open the app',
      url: '/quiz',
      source: 'admin_push',
      sentBy: 'admin',
      campaignId: 'camp-1',
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      user_id: 'u1',
      title: 'Important update',
      body: 'Please open the app',
      url: '/quiz',
      source: 'admin_push',
      sent_by: 'admin',
      campaign_id: 'camp-1',
      read_at: null,
    });
  });
});
