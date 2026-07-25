/**
 * Server-only Supabase credentials used when Vercel env vars are missing.
 *
 * NEVER import this file from client components or shared client bundles.
 * Prefer setting SUPABASE_SERVICE_ROLE_KEY in Vercel project settings.
 *
 * If this key is ever exposed, rotate it immediately in Supabase → Settings → API.
 */
import { allowProductionSupabaseFallback } from '@/lib/supabase-public-config';

function clean(value: string | undefined | null): string {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

/** Last-resort service role for production deploys missing Vercel env configuration. */
export const PRODUCTION_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscXJiYnFzdWtzbmNyeGpjbWJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTkxNDYyNiwiZXhwIjoyMDgxNDkwNjI2fQ.dCgntlDUdEBWte2Ry7R_sNmxCN2WpnqaOYMovmYo2Tc';

export function resolveServiceRoleKey(): string {
  const envKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (envKey.length > 40) return envKey;
  if (allowProductionSupabaseFallback()) return PRODUCTION_SUPABASE_SERVICE_ROLE_KEY;
  return '';
}

export function hasEffectiveServiceRoleKey(): boolean {
  return resolveServiceRoleKey().length > 40;
}
