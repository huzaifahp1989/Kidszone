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
});
