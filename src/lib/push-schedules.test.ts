import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendPush: vi.fn(),
  createCampaign: vi.fn(),
  finalizeCampaign: vi.fn(),
}));

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));
vi.mock('@/lib/onesignal-server', () => ({
  isOneSignalServerConfigured: () => true,
  sendOneSignalPushMultiApp: mocks.sendPush,
}));
vi.mock('@/lib/push-campaigns', () => ({
  createPushCampaign: mocks.createCampaign,
  finalizePushCampaign: mocks.finalizeCampaign,
}));

import { broadcastScheduledPush } from '@/lib/push-schedules';

describe('broadcastScheduledPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createCampaign.mockResolvedValue('campaign-1');
    mocks.sendPush.mockResolvedValue({ ok: true, recipients: 1, perApp: [] });
  });

  it('sends an individual schedule only to the selected external user id', async () => {
    const result = await broadcastScheduledPush({
      title: 'Quiz time',
      body: "Take today's quiz",
      audience: 'user',
      targetUserId: 'learner-42',
    });

    expect(result.ok).toBe(true);
    expect(mocks.sendPush).toHaveBeenCalledTimes(1);
    expect(mocks.sendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        externalUserIds: ['learner-42'],
        preferBothTargets: true,
      })
    );
    expect(mocks.sendPush.mock.calls[0][0]).not.toHaveProperty('includedSegments');
    expect(mocks.sendPush.mock.calls[0][0]).not.toHaveProperty('playerIds');
  });

  it('refuses an individual schedule without a target instead of broadcasting', async () => {
    const result = await broadcastScheduledPush({
      title: 'Quiz time',
      body: "Take today's quiz",
      audience: 'user',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('no target user');
    expect(mocks.sendPush).not.toHaveBeenCalled();
  });
});
