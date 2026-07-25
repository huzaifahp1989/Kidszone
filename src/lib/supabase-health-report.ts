import { randomUUID } from 'crypto';
import {
  allowProductionSupabaseFallback,
  isPlaceholderAnonKey,
  isPlaceholderSupabaseUrl,
  resolvePublicSupabaseAnonKey,
  resolvePublicSupabaseUrl,
} from '@/lib/supabase-public-config';
import { hasEffectiveServiceRoleKey, resolveServiceRoleKey } from '@/lib/supabase-server-secrets';
import { hasSupabaseServiceRole } from '@/lib/supabase-admin';

export type HealthIssue = {
  code: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  fixHint: string;
};

export type PlatformFeatureStatus = 'working' | 'degraded' | 'broken';

export type SupabaseHealthReport = {
  ok: boolean;
  checkedAt: string;
  platform: {
    signup: PlatformFeatureStatus;
    points: PlatformFeatureStatus;
    signupMessage: string;
    pointsMessage: string;
  };
  issues: HealthIssue[];
  checks: {
    envUrlSet: boolean;
    envAnonSet: boolean;
    envServiceRoleSet: boolean;
    effectiveUrl: boolean;
    effectiveAnon: boolean;
    effectiveServiceRole: boolean;
    serviceRoleFromEnv: boolean;
    serviceRoleUsingFallback: boolean;
    urlUsingFallback: boolean;
    anonUsingFallback: boolean;
    effectiveUrlHost: string | null;
    authHealthOk: boolean;
    usersTableOk: boolean;
    usersPointsReadOk: boolean;
    quizAttemptsTableOk: boolean;
    quizWriteOk: boolean;
    pointsWriteOk: boolean;
    quizSubmissionsAllowed: boolean;
    recentSignups7d: number | null;
  };
};

function pushIssue(
  issues: HealthIssue[],
  issue: HealthIssue
) {
  issues.push(issue);
}

export async function buildSupabaseHealthReport(): Promise<SupabaseHealthReport> {
  const issues: HealthIssue[] = [];
  const envUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const envAnon = String(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  ).trim();
  const envService = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  const effectiveUrl = resolvePublicSupabaseUrl();
  const effectiveAnon = resolvePublicSupabaseAnonKey();
  const effectiveServiceRole = hasSupabaseServiceRole();
  const urlOk = !isPlaceholderSupabaseUrl(effectiveUrl);
  const anonOk =
    !isPlaceholderAnonKey(envAnon) ||
    (allowProductionSupabaseFallback() && !isPlaceholderSupabaseUrl(effectiveUrl));

  if (!urlOk) {
    pushIssue(issues, {
      code: 'supabase_url_missing',
      severity: 'critical',
      message: 'Supabase URL is not configured.',
      fixHint:
        'In Vercel → Project Settings → Environment Variables, set NEXT_PUBLIC_SUPABASE_URL to your project URL (e.g. https://xxxx.supabase.co), then redeploy.',
    });
  } else if (isPlaceholderSupabaseUrl(envUrl) && allowProductionSupabaseFallback()) {
    pushIssue(issues, {
      code: 'supabase_url_fallback',
      severity: 'warning',
      message: 'Supabase URL env is missing — using built-in production fallback.',
      fixHint: 'Set NEXT_PUBLIC_SUPABASE_URL on Vercel so the app does not rely on the code fallback.',
    });
  }

  if (!anonOk) {
    pushIssue(issues, {
      code: 'supabase_anon_missing',
      severity: 'critical',
      message: 'Supabase anon key is not configured.',
      fixHint:
        'Set NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel from Supabase → Project Settings → API → anon public key.',
    });
  } else if (isPlaceholderAnonKey(envAnon) && allowProductionSupabaseFallback()) {
    pushIssue(issues, {
      code: 'supabase_anon_fallback',
      severity: 'warning',
      message: 'Supabase anon key env is missing — using built-in production fallback.',
      fixHint: 'Set NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel for a cleaner, rotatable setup.',
    });
  }

  if (!effectiveServiceRole) {
    pushIssue(issues, {
      code: 'service_role_missing',
      severity: 'critical',
      message: 'Service role key is missing — quiz points and sign-up profile writes will fail.',
      fixHint:
        'Set SUPABASE_SERVICE_ROLE_KEY in Vercel from Supabase → Project Settings → API → service_role (server only, never in client code).',
    });
  } else if (!envService) {
    pushIssue(issues, {
      code: 'service_role_fallback',
      severity: 'warning',
      message: 'Service role is using a built-in fallback because Vercel env is empty.',
      fixHint:
        'Add SUPABASE_SERVICE_ROLE_KEY to Vercel and rotate the key in Supabase if it was ever exposed.',
    });
  }

  let authHealthOk = false;
  let usersTableOk = false;
  let usersPointsReadOk = false;
  let quizAttemptsTableOk = false;
  let quizWriteOk = false;
  let pointsWriteOk = false;
  let recentSignups7d: number | null = null;

  if (urlOk && anonOk) {
    try {
      const authHealth = await fetch(`${effectiveUrl}/auth/v1/health`, {
        headers: { apikey: effectiveAnon, Authorization: `Bearer ${effectiveAnon}` },
        cache: 'no-store',
      });
      authHealthOk = authHealth.ok;
      if (!authHealthOk) {
        pushIssue(issues, {
          code: 'auth_health_failed',
          severity: 'critical',
          message: `Supabase Auth health check failed (HTTP ${authHealth.status}).`,
          fixHint: 'Verify NEXT_PUBLIC_SUPABASE_URL and anon key match the same Supabase project.',
        });
      }
    } catch (err: any) {
      pushIssue(issues, {
        code: 'auth_health_error',
        severity: 'critical',
        message: `Could not reach Supabase Auth: ${err?.message || 'network error'}`,
        fixHint: 'Check Supabase project status and Vercel env URL.',
      });
    }
  }

  if (urlOk && effectiveServiceRole) {
    const serviceKey = resolveServiceRoleKey();
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    };

    try {
      const usersRes = await fetch(`${effectiveUrl}/rest/v1/users?select=uid&limit=1`, {
        headers,
        cache: 'no-store',
      });
      usersTableOk = usersRes.ok;
      if (!usersRes.ok) {
        pushIssue(issues, {
          code: 'users_table_read_failed',
          severity: 'critical',
          message: `Cannot read users table (HTTP ${usersRes.status}). Sign-up profiles may not save.`,
          fixHint: 'Confirm SUPABASE_SERVICE_ROLE_KEY is correct and the public.users table exists.',
        });
      }
    } catch (err: any) {
      pushIssue(issues, {
        code: 'users_table_error',
        severity: 'critical',
        message: `Users table probe failed: ${err?.message || 'unknown error'}`,
        fixHint: 'Check Supabase connection and service role key.',
      });
    }

    try {
      const pointsRes = await fetch(`${effectiveUrl}/rest/v1/users_points?select=user_id&limit=1`, {
        headers,
        cache: 'no-store',
      });
      usersPointsReadOk = pointsRes.ok;
      if (!pointsRes.ok) {
        pushIssue(issues, {
          code: 'users_points_read_failed',
          severity: 'critical',
          message: `Cannot read users_points (HTTP ${pointsRes.status}). Leaderboard points will not update.`,
          fixHint: 'Run users_points setup SQL and verify service role key on Vercel.',
        });
      }
    } catch (err: any) {
      pushIssue(issues, {
        code: 'users_points_error',
        severity: 'critical',
        message: `users_points probe failed: ${err?.message || 'unknown error'}`,
        fixHint: 'Check users_points table and SUPABASE_SERVICE_ROLE_KEY.',
      });
    }

    try {
      const quizRes = await fetch(`${effectiveUrl}/rest/v1/quiz_attempts?select=id&limit=1`, {
        headers,
        cache: 'no-store',
      });
      quizAttemptsTableOk = quizRes.ok;
      if (!quizRes.ok) {
        pushIssue(issues, {
          code: 'quiz_attempts_read_failed',
          severity: 'warning',
          message: `Cannot read quiz_attempts (HTTP ${quizRes.status}). Quiz submit may fail.`,
          fixHint: 'Run SUPABASE_DAILY_QUIZ.sql or quiz migrations in Supabase SQL editor.',
        });
      }
    } catch {
      /* non-fatal */
    }

    const writeHeaders = {
      ...headers,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    const probeId = randomUUID();
    const probeDate = `2097-${String(1 + (Date.now() % 12)).padStart(2, '0')}-${String(1 + (Date.now() % 28)).padStart(2, '0')}`;
    try {
      const insertRes = await fetch(`${effectiveUrl}/rest/v1/daily_quizzes`, {
        method: 'POST',
        headers: writeHeaders,
        body: JSON.stringify({
          id: probeId,
          quiz_date: probeDate,
          question_ids: ['health-probe'],
          is_published: false,
        }),
        cache: 'no-store',
      });
      quizWriteOk = insertRes.ok;
      if (!insertRes.ok) {
        pushIssue(issues, {
          code: 'quiz_write_failed',
          severity: 'critical',
          message: `Cannot write daily_quizzes (HTTP ${insertRes.status}). Quiz submit will hang or fail.`,
          fixHint: 'Set SUPABASE_SERVICE_ROLE_KEY on Vercel and run daily quiz SQL migrations.',
        });
      }
      await fetch(`${effectiveUrl}/rest/v1/daily_quizzes?id=eq.${probeId}`, {
        method: 'DELETE',
        headers,
        cache: 'no-store',
      }).catch(() => null);
    } catch (err: any) {
      pushIssue(issues, {
        code: 'quiz_write_error',
        severity: 'critical',
        message: `daily_quizzes write probe failed: ${err?.message || 'unknown error'}`,
        fixHint: 'Check service role key and daily_quizzes table in Supabase.',
      });
    }

    try {
      const patchRes = await fetch(
        `${effectiveUrl}/rest/v1/users_points?user_id=eq.00000000-0000-0000-0000-000000000000`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ today_points: 0 }),
          cache: 'no-store',
        }
      );
      pointsWriteOk = patchRes.ok || patchRes.status === 404;
      if (!pointsWriteOk) {
        pushIssue(issues, {
          code: 'points_write_failed',
          severity: 'critical',
          message: `Cannot update users_points (HTTP ${patchRes.status}). Points will not save after quizzes.`,
          fixHint: 'Set SUPABASE_SERVICE_ROLE_KEY on Vercel. Without it the server uses the anon key and RLS blocks writes.',
        });
      }
    } catch (err: any) {
      pushIssue(issues, {
        code: 'points_write_error',
        severity: 'critical',
        message: `users_points write probe failed: ${err?.message || 'unknown error'}`,
        fixHint: 'Verify users_points table exists and service role key is set on Vercel.',
      });
    }

    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const countRes = await fetch(
        `${effectiveUrl}/rest/v1/users?select=uid&created_at=gte.${encodeURIComponent(since)}`,
        {
          headers: { ...headers, Prefer: 'count=exact' },
          cache: 'no-store',
        }
      );
      const range = countRes.headers.get('content-range');
      if (range) {
        const match = range.match(/\/(\d+)$/);
        recentSignups7d = match ? Number(match[1]) : null;
      }
    } catch {
      recentSignups7d = null;
    }
  }

  const signup: PlatformFeatureStatus =
    authHealthOk && usersTableOk ? 'working' : authHealthOk || usersTableOk ? 'degraded' : 'broken';

  const quizSubmissionsAllowed = quizWriteOk && pointsWriteOk;

  const points: PlatformFeatureStatus =
    usersPointsReadOk && effectiveServiceRole && quizSubmissionsAllowed
      ? 'working'
      : usersPointsReadOk && effectiveServiceRole
        ? 'degraded'
        : 'broken';

  const signupMessage =
    signup === 'working'
      ? 'Sign up and auth are working — new users can join.'
      : signup === 'degraded'
        ? 'Sign up may be partially working — check issues below.'
        : 'Sign up is likely broken — fix Supabase env issues below.';

  const pointsMessage =
    points === 'working'
      ? 'Points are working — quizzes and games can award leaderboard points.'
      : points === 'degraded'
        ? 'Points may save but quiz logging could be incomplete.'
        : 'Points are not saving — set SUPABASE_SERVICE_ROLE_KEY on Vercel.';

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const ok = criticalCount === 0 && signup !== 'broken' && points !== 'broken';

  if (ok && issues.length === 0) {
    pushIssue(issues, {
      code: 'all_clear',
      severity: 'info',
      message: 'All Supabase checks passed. Sign up and points are operational.',
      fixHint: 'No action needed. Re-check after changing Vercel env or Supabase schema.',
    });
  }

  return {
    ok,
    checkedAt: new Date().toISOString(),
    platform: { signup, points, signupMessage, pointsMessage },
    issues,
    checks: {
      envUrlSet: Boolean(envUrl),
      envAnonSet: Boolean(envAnon),
      envServiceRoleSet: envService.length > 40,
      effectiveUrl: urlOk,
      effectiveAnon: anonOk,
      effectiveServiceRole,
      serviceRoleFromEnv: envService.length > 40,
      serviceRoleUsingFallback: hasEffectiveServiceRoleKey() && envService.length <= 40,
      urlUsingFallback: urlOk && isPlaceholderSupabaseUrl(envUrl),
      anonUsingFallback: isPlaceholderAnonKey(envAnon) && allowProductionSupabaseFallback(),
      effectiveUrlHost: urlOk ? new URL(effectiveUrl).host : null,
      authHealthOk,
      usersTableOk,
      usersPointsReadOk,
      quizAttemptsTableOk,
      quizWriteOk,
      pointsWriteOk,
      quizSubmissionsAllowed,
      recentSignups7d,
    },
  };
}
