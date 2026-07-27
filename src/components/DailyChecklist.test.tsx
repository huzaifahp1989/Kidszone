import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DailyChecklist from '@/components/DailyChecklist';

const refreshProfile = vi.fn();
const updateLocalProfile = vi.fn();
const maybeSingleMock = vi.fn();
const supabaseFromMock = vi.fn(() => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: maybeSingleMock,
  };
  return query;
});

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    loading: false,
    refreshProfile,
    updateLocalProfile,
  }),
}));

vi.mock('@/lib/auth-headers', () => ({
  getAuthFetchHeaders: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => supabaseFromMock(...args),
  },
}));

function mockJsonResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  });
}

function deferredResponse() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('DailyChecklist', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refreshProfile.mockReset();
    updateLocalProfile.mockReset();
    maybeSingleMock.mockReset();
    supabaseFromMock.mockClear();
  });

  it('keeps the latest checklist points when saves happen back to back', async () => {
    const firstPost = deferredResponse();
    const secondPost = deferredResponse();
    let postCount = 0;

    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/daily-checklist?userId=user-1')) {
        return mockJsonResponse({
          success: true,
          data: {
            completed_items: [],
            good_deed: '',
            daily_points: 0,
          },
        }) as any;
      }

      if (url.includes('/api/daily-checklist') && init?.method === 'POST') {
        postCount += 1;
        return (postCount === 1 ? firstPost.promise : secondPost.promise) as any;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<DailyChecklist />);

    await screen.findByText('My Daily Deeds');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /fajr/i }));
    fireEvent.click(screen.getByRole('button', { name: /dhuhr/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    firstPost.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        points: 2,
        totals: {
          totalPoints: 102,
          weeklyPoints: 32,
          monthlyPoints: 52,
          todayPoints: 2,
          badges: 1,
          level: 1,
        },
      }),
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));

    secondPost.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        points: 4,
        totals: {
          totalPoints: 104,
          weeklyPoints: 34,
          monthlyPoints: 54,
          todayPoints: 4,
          badges: 1,
          level: 1,
        },
      }),
    });

    await screen.findByText(/4 Points Today/i);

    await waitFor(() =>
      expect(updateLocalProfile).toHaveBeenLastCalledWith({
        points: 104,
        weeklyPoints: 34,
        monthlyPoints: 54,
        todayPoints: 4,
        badges: 1,
        level: 'Level 1',
      })
    );

    expect(refreshProfile).not.toHaveBeenCalled();
  });

  it('falls back to a direct Supabase read when the checklist API load fails', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        completed_items: ['fajr', 'dhuhr'],
        good_deed: 'Helped my parents',
        daily_points: 6,
      },
      error: null,
    });

    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/daily-checklist?userId=user-1')) {
        return mockJsonResponse({ success: false, error: 'server down' }, false) as any;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<DailyChecklist />);

    await screen.findByText('My Daily Deeds');
    await screen.findByText(/6 Points Today/i);
    expect(screen.getByDisplayValue('Helped my parents')).toBeInTheDocument();
    expect(maybeSingleMock).toHaveBeenCalled();
  });
});
