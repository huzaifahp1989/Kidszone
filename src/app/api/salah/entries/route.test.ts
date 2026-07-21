import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/request-auth', () => ({
  getAuthenticatedRequestUser: vi.fn(async () => ({ id: 'user-1', email: 'u@example.com' })),
}));

const buildThenable = (result: any) => ({
  select: () => builder(result),
  eq: () => builder(result),
  gte: () => builder(result),
  lte: () => builder(result),
  order: () => builder(result),
  then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
});

const builder = (result: any) => buildThenable(result);

const upsertBuilder = (result: any) => ({
  select: () => ({
    single: async () => result,
  }),
});

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: () => builder({ data: [], error: null }),
      upsert: () => upsertBuilder({ data: null, error: null }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    })),
  },
}));

import { GET, POST } from './route';
import { supabaseAdmin } from '@/lib/supabase-admin';

describe('/api/salah/entries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET validates missing params', async () => {
    const res = await GET(new Request('http://localhost/api/salah/entries'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it('GET returns entries', async () => {
    (supabaseAdmin.from as any).mockReturnValueOnce({
      select: () =>
        builder({
          data: [
            {
              id: '1',
              user_id: 'user-1',
              date: '2026-05-01',
              prayer: 'fajr',
              status: 'completed',
              prayed_at: null,
              notes: null,
              created_at: '2026-05-01T00:00:00.000Z',
              updated_at: '2026-05-01T00:00:00.000Z',
            },
          ],
          error: null,
        }),
    });

    const res = await GET(new Request('http://localhost/api/salah/entries?from=2026-05-01&to=2026-05-02'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entries).toHaveLength(1);
    expect(json.entries[0].prayer).toBe('fajr');
  });

  it('POST upserts an entry', async () => {
    (supabaseAdmin.from as any).mockReturnValueOnce({
      upsert: () =>
        upsertBuilder({
          data: {
            id: '1',
            user_id: 'user-1',
            date: '2026-05-01',
            prayer: 'fajr',
            status: 'completed',
            prayed_at: '2026-05-01T04:30:00.000Z',
            notes: null,
            created_at: '2026-05-01T00:00:00.000Z',
            updated_at: '2026-05-01T00:00:00.000Z',
          },
          error: null,
        }),
    });

    const res = await POST(
      new Request('http://localhost/api/salah/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: '2026-05-01', prayer: 'fajr', status: 'completed' }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entry.date).toBe('2026-05-01');
    expect(json.entry.status).toBe('completed');
  });
});

