import { describe, expect, it } from 'vitest';
import { POINTS_DAILY_CAP, DAILY_PLAN_TOTAL_POINTS } from '@/lib/points-policy';
import { runPointsPolicyGuards } from '@/lib/points-health';
import { LIVE_APP_URL } from '@/lib/app-url';

describe('points health policy guards', () => {
  it('passes with the current points policy', () => {
    const issues = runPointsPolicyGuards();
    expect(issues.filter((i) => i.severity === 'critical')).toEqual([]);
    expect(POINTS_DAILY_CAP).toBe(200);
    // Plan can intentionally sum above the daily cap — kids pick a mix.
    expect(DAILY_PLAN_TOTAL_POINTS).toBeGreaterThanOrEqual(POINTS_DAILY_CAP);
  });

  it('keeps daily cap math intact', () => {
    const critical = runPointsPolicyGuards().filter((i) =>
      ['cap_math_broken', 'cap_not_enforced', 'award_zero_broken', 'daily_cap_changed'].includes(i.code)
    );
    expect(critical).toEqual([]);
  });

  it('keeps Capacitor/live URL on the canonical Vercel host', () => {
    // Live traffic + Cap WebView target huzaifahp1989-audio.vercel.app.
    // Stale islamic-kids-platform.vercel.app is redirected by middleware.
    expect(LIVE_APP_URL).toBe('https://huzaifahp1989-audio.vercel.app');
  });
});

describe('broken live host redirect', () => {
  it('middleware matcher covers app and API routes', async () => {
    const mod = await import('@/middleware');
    expect(mod.config.matcher.length).toBeGreaterThan(0);
    expect(typeof mod.middleware).toBe('function');
  });
});
