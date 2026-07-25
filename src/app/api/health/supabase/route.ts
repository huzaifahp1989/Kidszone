import { NextResponse } from 'next/server';
import {
  isPlaceholderAnonKey,
  isPlaceholderSupabaseUrl,
  allowProductionSupabaseFallback,
  resolvePublicSupabaseUrl,
} from '@/lib/supabase-public-config';
import { hasEffectiveServiceRoleKey, resolveServiceRoleKey } from '@/lib/supabase-server-secrets';
import { hasSupabaseServiceRole } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';

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
  let adminQuizWriteOk = false;
  let adminQuizWriteError: string | null = null;
  let adminPointsWriteOk = false;
  let adminPointsWriteError: string | null = null;

  if (urlOk && effectiveServiceRole) {
    const serviceKey = resolveServiceRoleKey();
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    try {
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

    // Prove service role can create (and delete) a daily_quizzes session row —
    // the same write path quiz submit uses before awarding points.
    const probeId = randomUUID();
    const probeDate = `2097-${String(1 + (Date.now() % 12)).padStart(2, '0')}-${String(1 + (Date.now() % 28)).padStart(2, '0')}`;
    try {
      const insertRes = await fetch(`${effectiveUrl}/rest/v1/daily_quizzes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: probeId,
          quiz_date: probeDate,
          question_ids: ['health-probe'],
          is_published: false,
        }),
        cache: 'no-store',
      });
      adminQuizWriteOk = insertRes.ok;
      if (!insertRes.ok) {
        adminQuizWriteError = `status_${insertRes.status}`;
      }
      await fetch(`${effectiveUrl}/rest/v1/daily_quizzes?id=eq.${probeId}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: 'no-store',
      }).catch(() => null);
    } catch (err: any) {
      adminQuizWriteError = err?.message || 'quiz_write_failed';
    }

    try {
      const patchRes = await fetch(
        `${effectiveUrl}/rest/v1/users_points?user_id=eq.00000000-0000-0000-0000-000000000000`,
        {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ today_points: 0 }),
          cache: 'no-store',
        }
      );
      // 204/200 = allowed; 404 also means RLS did not block the request shape.
      adminPointsWriteOk = patchRes.ok || patchRes.status === 404;
      if (!adminPointsWriteOk) {
        adminPointsWriteError = `status_${patchRes.status}`;
      }
    } catch (err: any) {
      adminPointsWriteError = err?.message || 'points_write_failed';
    }
  }

  const configured =
    urlOk &&
    anonOk &&
    effectiveServiceRole &&
    adminPointsReadOk &&
    adminQuizWriteOk &&
    adminPointsWriteOk;

  return NextResponse.json({
    configured,
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
    admin_quiz_write_ok: adminQuizWriteOk,
    admin_quiz_write_error: adminQuizWriteError,
    admin_points_write_ok: adminPointsWriteOk,
    admin_points_write_error: adminPointsWriteError,
    quiz_submissions_allowed: adminQuizWriteOk && adminPointsWriteOk,
  });
}
