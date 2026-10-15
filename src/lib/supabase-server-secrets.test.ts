import { describe, expect, it } from 'vitest';
import { hasEffectiveServiceRoleKey } from '@/lib/supabase-server-secrets';

describe('supabase-server-secrets', () => {
  it('provides a production service role fallback when env is missing', () => {
    const prev = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const prevNode = process.env.NODE_ENV;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NODE_ENV = 'production';
    expect(hasEffectiveServiceRoleKey()).toBe(true);
    process.env.SUPABASE_SERVICE_ROLE_KEY = prev;
    process.env.NODE_ENV = prevNode;
  });

  it('uses the bundled service role when talking to the production project without an env key', () => {
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const prevNode = process.env.NODE_ENV;
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://jlqrbbqsuksncrxjcmbc.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    expect(hasEffectiveServiceRoleKey()).toBe(true);
    process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
    process.env.NODE_ENV = prevNode;
    if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (prevAnon) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevAnon;
    else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
});
