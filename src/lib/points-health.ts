import { POINTS_DAILY_CAP, DAILY_PLAN_TOTAL_POINTS, resolvePointsToAward } from '@/lib/points-policy';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';

export type PointsHealthIssue = {
  code: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  fixHint?: string;
};

export type PointsHealthReport = {
  ok: boolean;
  checkedAt: string;
  issues: PointsHealthIssue[];
  checks: Record<string, boolean | number | string | null>;
};

const REQUIRED_POINTS_COLUMNS = [
  'user_id',
  'total_points',
  'weekly_points',
  'monthly_points',
  'today_points',
  'last_earned_date',
  'badges',
  'level',
] as const;

/** Pure policy guards — safe to unit test without Supabase. */
export function runPointsPolicyGuards(): PointsHealthIssue[] {
  const issues: PointsHealthIssue[] = [];

  if (POINTS_DAILY_CAP !== 200) {
    issues.push({
      code: 'daily_cap_changed',
      severity: 'critical',
      message: `POINTS_DAILY_CAP is ${POINTS_DAILY_CAP}, expected 200.`,
      fixHint: 'Restore POINTS_DAILY_CAP to 200 in src/lib/points-policy.ts unless product intentionally changed it.',
    });
  }

  if (DAILY_PLAN_TOTAL_POINTS < POINTS_DAILY_CAP) {
    issues.push({
      code: 'daily_plan_too_low',
      severity: 'warning',
      message: `Daily earning plan totals ${DAILY_PLAN_TOTAL_POINTS}, below the ${POINTS_DAILY_CAP} daily cap.`,
    });
  }

  if (resolvePointsToAward(50, 180, true) !== 20) {
    issues.push({
      code: 'cap_math_broken',
      severity: 'critical',
      message: 'resolvePointsToAward(50, 180) did not return 20 — daily cap math is broken.',
      fixHint: 'Check resolvePointsToAward in src/lib/points-policy.ts.',
    });
  }

  if (resolvePointsToAward(25, 200, true) !== 0) {
    issues.push({
      code: 'cap_not_enforced',
      severity: 'critical',
      message: 'Daily cap is not blocking awards when today_points is already at the limit.',
      fixHint: 'Check resolvePointsToAward in src/lib/points-policy.ts.',
    });
  }

  if (resolvePointsToAward(25, 0, true) !== 25) {
    issues.push({
      code: 'award_zero_broken',
      severity: 'critical',
      message: 'Basic point awards are returning the wrong amount.',
    });
  }

  return issues;
}

async function tableReadable(
  table: string,
  select: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from(table).select(select).limit(1);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Live Supabase + points schema diagnostics.
 * Safe read-only checks — never writes or awards points.
 */
export async function runPointsHealthCheck(): Promise<PointsHealthReport> {
  const issues = runPointsPolicyGuards();
  const checks: Record<string, boolean | number | string | null> = {
    daily_cap: POINTS_DAILY_CAP,
    daily_plan_total: DAILY_PLAN_TOTAL_POINTS,
    service_role_configured: hasSupabaseServiceRole(),
  };

  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  checks.supabase_url_configured = Boolean(url) && !url.includes('placeholder.supabase.co');

  if (!checks.supabase_url_configured) {
    issues.push({
      code: 'supabase_url_missing',
      severity: 'critical',
      message: 'Supabase URL is missing or still set to the placeholder.',
      fixHint:
        'Set NEXT_PUBLIC_SUPABASE_URL (and anon/service_role keys) on this Vercel project. If Capacitor/LIVE_APP_URL points here, switch it to islamic-kids-platform.vercel.app or copy env from that project.',
    });
  }

  if (!hasSupabaseServiceRole()) {
    issues.push({
      code: 'service_role_missing',
      severity: 'critical',
      message: 'SUPABASE_SERVICE_ROLE_KEY is missing — point awards and admin writes will fail RLS.',
      fixHint: 'Copy the service_role key from Supabase → Project Settings → API into Vercel env.',
    });
  }

  if (checks.supabase_url_configured) {
    const usersPoints = await tableReadable(
      'users_points',
      REQUIRED_POINTS_COLUMNS.join(',')
    );
    checks.users_points_readable = usersPoints.ok;
    if (!usersPoints.ok) {
      const missingCol = /column .* does not exist/i.test(String(usersPoints.error || ''));
      issues.push({
        code: missingCol ? 'users_points_schema' : 'users_points_unreadable',
        severity: 'critical',
        message: `users_points is not readable: ${usersPoints.error}`,
        fixHint: missingCol
          ? 'Run FIX_POINTS_SYSTEM_COMPLETE.sql (or latest points migration) in Supabase.'
          : 'Check RLS policies and service role key for users_points.',
      });
    }

    const users = await tableReadable('users', 'uid,points,weeklypoints,monthlypoints');
    checks.users_readable = users.ok;
    if (!users.ok) {
      issues.push({
        code: 'users_unreadable',
        severity: 'critical',
        message: `users table is not readable: ${users.error}`,
        fixHint: 'Verify users table exists and service role can select uid/points columns.',
      });
    }

    // Drift sample: compare a handful of rows where both tables have points.
    if (usersPoints.ok && users.ok) {
      const { data: sampleRows, error: sampleError } = await supabaseAdmin
        .from('users_points')
        .select('user_id, total_points, weekly_points')
        .gt('total_points', 0)
        .order('total_points', { ascending: false })
        .limit(25);

      if (sampleError) {
        checks.drift_sample_ok = false;
        issues.push({
          code: 'drift_sample_failed',
          severity: 'warning',
          message: `Could not sample users_points for drift checks: ${sampleError.message}`,
        });
      } else {
        const ids = (sampleRows || []).map((r) => String((r as { user_id: string }).user_id));
        let drifted = 0;
        if (ids.length) {
          const { data: userRows } = await supabaseAdmin
            .from('users')
            .select('uid, points, weeklypoints')
            .in('uid', ids);

          const byUid = new Map(
            (userRows || []).map((row) => [
              String((row as { uid: string }).uid),
              row as { points?: number; weeklypoints?: number },
            ])
          );

          for (const row of sampleRows || []) {
            const uid = String((row as { user_id: string }).user_id);
            const mirror = byUid.get(uid);
            if (!mirror) continue;
            const total = Number((row as { total_points: number }).total_points || 0);
            const weekly = Number((row as { weekly_points: number }).weekly_points || 0);
            if (Number(mirror.points || 0) !== total || Number(mirror.weeklypoints || 0) !== weekly) {
              drifted += 1;
            }
          }
        }
        checks.drift_sample_size = ids.length;
        checks.drift_count = drifted;
        checks.drift_sample_ok = true;
        if (drifted > 0) {
          issues.push({
            code: 'users_points_drift',
            severity: drifted >= 5 ? 'critical' : 'warning',
            message: `Found ${drifted}/${ids.length} sampled users where users.points/weeklypoints disagree with users_points.`,
            fixHint:
              'Point awards may be updating users_points but failing to sync users. Check server-points users sync logs and repair via admin recalc tools.',
          });
        }
      }
    }
  }

  const critical = issues.some((i) => i.severity === 'critical');
  return {
    ok: !critical,
    checkedAt: new Date().toISOString(),
    issues,
    checks,
  };
}
