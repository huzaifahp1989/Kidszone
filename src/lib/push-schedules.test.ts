import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendPush: vi.fn(),
  createCampaign: vi.fn(),
  finalizeCampaign: vi.fn(),
  tokens: vi.fn(),
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        limit: () => ({ eq: () => mocks.tokens() }),
      }),
    }),
  },
}));
vi.mock('@/lib/onesignal-server', () => ({
  ONESIGNAL_PUSH_SEGMENTS: ['Total Subscriptions'],
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
    mocks.tokens.mockResolvedValue({ data: [], error: null });
  });

  it('sends an individual schedule to the selected learner saved devices', async () => {
    mocks.tokens.mockResolvedValue({
      data: [
        {
          user_id: 'learner-42',
          token: '3f724c9d-a738-4ea8-b82f-4f89afa82f5e',
          provider: 'onesignal',
        },
      ],
      error: null,
    });

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
        playerIds: ['3f724c9d-a738-4ea8-b82f-4f89afa82f5e'],
      })
    );
    expect(mocks.sendPush.mock.calls[0][0]).not.toHaveProperty('includedSegments');
  });

  it('falls back to the external user id when the learner has no saved device', async () => {
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
