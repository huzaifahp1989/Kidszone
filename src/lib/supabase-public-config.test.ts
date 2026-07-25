import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_SUPABASE_URL,
  isPlaceholderSupabaseUrl,
  resolvePublicSupabaseUrl,
} from '@/lib/supabase-public-config';
import { LIVE_APP_URL } from '@/lib/app-url';

describe('supabase-public-config', () => {
  it('detects placeholder URLs', () => {
    expect(isPlaceholderSupabaseUrl('')).toBe(true);
    expect(isPlaceholderSupabaseUrl('https://placeholder.supabase.co')).toBe(true);
    expect(isPlaceholderSupabaseUrl(PRODUCTION_SUPABASE_URL)).toBe(false);
  });

  it('falls back to production URL in production builds', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    expect(resolvePublicSupabaseUrl()).toBe(PRODUCTION_SUPABASE_URL);
    process.env.NODE_ENV = prev;
  });

  it('falls back to production URL in local dev when env vars are unset', () => {
    const prevNode = process.env.NODE_ENV;
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    expect(resolvePublicSupabaseUrl()).toBe(PRODUCTION_SUPABASE_URL);
    process.env.NODE_ENV = prevNode;
    if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    if (prevKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
  });
});

describe('live app URL', () => {
  it('points at the deployment with the fixed quiz bundle', () => {
    expect(LIVE_APP_URL).toContain('huzaifahp1989-audio.vercel.app');
  });
});
