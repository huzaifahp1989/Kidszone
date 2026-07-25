import { NextResponse } from 'next/server';
import {
  isPlaceholderAnonKey,
  isPlaceholderSupabaseUrl,
  allowProductionSupabaseFallback,
  resolvePublicSupabaseUrl,
} from '@/lib/supabase-public-config';
import { hasEffectiveServiceRoleKey, resolveServiceRoleKey } from '@/lib/supabase-server-secrets';
import { hasSupabaseServiceRole } from '@/lib/supabase-admin';

export async function GET() {
  const envUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const envAnon = String(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  ).trim();
  const envService = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  const effectiveUrl = resolvePublicSupabaseUrl();
  const effectiveServiceRole = hasSupabaseServiceRole();
  const urlOk = !isPlaceholderSupabaseUrl(effectiveUrl);
  const anonOk =
    !isPlaceholderAnonKey(envAnon) ||
    (allowProductionSupabaseFallback() && !isPlaceholderSupabaseUrl(effectiveUrl));

  let adminPointsReadOk = false;
  let adminPointsReadError: string | null = null;

  if (urlOk && effectiveServiceRole) {
    try {
      const serviceKey = resolveServiceRoleKey();
      const probe = await fetch(`${effectiveUrl}/rest/v1/users_points?select=user_id&limit=1`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: 'no-store',
      });
      adminPointsReadOk = probe.ok;
      if (!probe.ok) {
        adminPointsReadError = `status_${probe.status}`;
      }
    } catch (err: any) {
      adminPointsReadError = err?.message || 'probe_failed';
    }
  }

  return NextResponse.json({
    configured: urlOk && anonOk && effectiveServiceRole && adminPointsReadOk,
    next_public_supabase_url: Boolean(envUrl),
    next_public_supabase_anon_key: Boolean(envAnon),
    supabase_service_role_key: Boolean(envService),
    effective_supabase_url: urlOk,
    effective_supabase_anon: anonOk,
    effective_service_role: effectiveServiceRole,
    service_role_from_env: envService.length > 40,
    service_role_using_fallback: hasEffectiveServiceRoleKey() && envService.length <= 40,
    url_using_fallback: urlOk && isPlaceholderSupabaseUrl(envUrl),
    anon_using_fallback: isPlaceholderAnonKey(envAnon) && allowProductionSupabaseFallback(),
    effective_url_host: urlOk ? new URL(effectiveUrl).host : null,
    admin_points_read_ok: adminPointsReadOk,
    admin_points_read_error: adminPointsReadError,
  });
}
