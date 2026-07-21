import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/request-auth', () => ({
  getAuthenticatedRequestUser: vi.fn(async () => ({ id: 'user-1', email: 'u@example.com' })),
}));

const builder = (result: any) => ({
  select: () => builder(result),
  eq: () => builder(result),
  gte: () => builder(result),
  lte: () => builder(result),
  then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
});

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: () => builder({ data: [], error: null }),
    })),
  },
}));

import { GET } from './route';
import { supabaseAdmin } from '@/lib/supabase-admin';

describe('/api/salah/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns weekly stats', async () => {
    (supabaseAdmin.from as any).mockReturnValueOnce({
      select: () =>
        builder({
          data: [
            {
              id: '1',
              user_id: 'user-1',
              date: '2026-05-25',
              prayer: 'fajr',
              status: 'completed',
              prayed_at: null,
              notes: null,
              created_at: '2026-05-25T00:00:00.000Z',
              updated_at: '2026-05-25T00:00:00.000Z',
            },
          ],
          error: null,
        }),
    });

    const res = await GET(new Request('http://localhost/api/salah/stats?range=weekly&date=2026-05-25'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats).toBeTruthy();
    expect(typeof json.stats.completionRate).toBe('number');
  });
});

