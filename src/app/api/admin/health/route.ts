import { NextResponse } from 'next/server';
import { supabaseAdmin, hasSupabaseServiceRole } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { isR2Enabled } from '@/lib/object-storage';
import { readAuthoritativePointsSnapshot } from '@/lib/server-points';
import {
  isPlaceholderAnonKey,
  isPlaceholderSupabaseUrl,
  resolvePublicSupabaseAnonKey,
  resolvePublicSupabaseUrl,
} from '@/lib/supabase-public-config';

export const dynamic = 'force-dynamic';

type CheckStatus = 'ok' | 'warn' | 'fail';

type HealthCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  hint?: string;
};

type HealthGroup = {
  id: string;
  title: string;
  description: string;
  checks: HealthCheck[];
};

function present(value: string | undefined | null): boolean {
  return String(value || '').trim().length > 0;
}

/** Read-only health probe used by the admin connectivity page. Never mutates data. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks: HealthCheck[] = [];
  const groups: HealthGroup[] = [];

  // ---------------------------------------------------------------- configuration
  const publicUrl = resolvePublicSupabaseUrl();
  const publicAnonKey = resolvePublicSupabaseAnonKey();
  const urlFromEnv = present(process.env.NEXT_PUBLIC_SUPABASE_URL) || present(process.env.SUPABASE_URL);

  const configChecks: HealthCheck[] = [
    isPlaceholderSupabaseUrl(publicUrl)
      ? {
          id: 'config.url',
          label: 'Supabase URL',
          status: 'fail',
          detail: 'No usable Supabase URL is configured.',
          hint: 'Set NEXT_PUBLIC_SUPABASE_URL in your environment.',
        }
      : {
          id: 'config.url',
          label: 'Supabase URL',
          status: urlFromEnv ? 'ok' : 'warn',
          detail: urlFromEnv ? publicUrl : `${publicUrl} (bundled fallback — no env var set)`,
          hint: urlFromEnv ? undefined : 'Set NEXT_PUBLIC_SUPABASE_URL so the deployment is not relying on the bundled fallback.',
        },
    isPlaceholderAnonKey(publicAnonKey)
      ? {
          id: 'config.anonKey',
          label: 'Anon key (sign-in / sign-up)',
          status: 'fail',
          detail: 'No usable anon key — the browser cannot reach Supabase Auth.',
          hint: 'Set NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        }
      : {
          id: 'config.anonKey',
          label: 'Anon key (sign-in / sign-up)',
          status: 'ok',
          detail: `Present (${publicAnonKey.slice(0, 12)}…)`,
        },
    {
      id: 'config.serviceRole',
      label: 'Service role key (admin reads/writes)',
      status: hasSupabaseServiceRole() ? 'ok' : 'fail',
      detail: hasSupabaseServiceRole()
        ? 'Present — admin queries bypass RLS.'
        : 'Missing — admin reads and writes will fail with RLS errors.',
      hint: hasSupabaseServiceRole() ? undefined : 'Set SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API).',
    },
    {
      id: 'config.email',
      label: 'Transactional email (Resend)',
      status: present(process.env.RESEND_API_KEY) ? 'ok' : 'warn',
      detail: present(process.env.RESEND_API_KEY) ? 'RESEND_API_KEY present.' : 'RESEND_API_KEY is not set.',
      hint: present(process.env.RESEND_API_KEY) ? undefined : 'Welcome and approval emails are skipped without it.',
    },
  ];

  const onesignalAppId = present(process.env.ONESIGNAL_APP_ID);
  const onesignalKey = present(process.env.ONESIGNAL_REST_API_KEY);
  configChecks.push({
    id: 'config.push',
    label: 'Push notifications (OneSignal)',
    status: onesignalAppId && onesignalKey ? (present(process.env.ONESIGNAL_IOS_REST_API_KEY) ? 'ok' : 'warn') : 'warn',
    detail: onesignalAppId && onesignalKey
      ? `App configured. iOS key ${present(process.env.ONESIGNAL_IOS_REST_API_KEY) ? 'present' : 'missing'}.`
      : 'OneSignal app id or REST key is missing.',
    hint:
      onesignalAppId && onesignalKey && present(process.env.ONESIGNAL_IOS_REST_API_KEY)
        ? undefined
        : 'iOS devices will not receive pushes without ONESIGNAL_IOS_REST_API_KEY.',
  });

  groups.push({
    id: 'configuration',
    title: 'Connection & configuration',
    description: 'Credentials this deployment resolves at runtime. Secret values are never returned.',
    checks: configChecks,
  });
  checks.push(...configChecks);

  // ---------------------------------------------------------------- database
  const dbChecks: HealthCheck[] = [];
  let authUsers: Array<{ id: string; created_at?: string }> = [];
  let authTotal = 0;

  const usersCountResult = await supabaseAdmin.from('users').select('uid', { count: 'exact', head: true });
  const usersReachable = !usersCountResult.error;
  dbChecks.push({
    id: 'db.connection',
    label: 'Database connection',
    status: usersReachable ? 'ok' : 'fail',
    detail: usersReachable
      ? `Connected — ${usersCountResult.count ?? 0} learner profiles.`
      : `Connection failed: ${usersCountResult.error?.message}`,
  });

  const pointsCountResult = await supabaseAdmin.from('users_points').select('user_id', { count: 'exact', head: true });
  dbChecks.push({
    id: 'db.points',
    label: 'Points tables',
    status: pointsCountResult.error ? 'fail' : 'ok',
    detail: pointsCountResult.error
      ? `users_points unavailable: ${pointsCountResult.error.message}`
      : `users_points reachable — ${pointsCountResult.count ?? 0} rows.`,
    hint: pointsCountResult.error ? 'Apply the points migrations in supabase/migrations.' : undefined,
  });

  const recordingsProbe = await supabaseAdmin
    .from('recordings')
    .select('id, category, title, description, status, duration_seconds')
    .limit(1);
  dbChecks.push({
    id: 'db.recordings',
    label: 'Recordings table (studio columns)',
    status: recordingsProbe.error ? 'fail' : 'ok',
    detail: recordingsProbe.error
      ? `recordings unavailable: ${recordingsProbe.error.message}`
      : 'recordings reachable with category, title, description, status and duration_seconds.',
    hint: recordingsProbe.error
      ? 'Apply supabase/migrations/20261020_recording_studio_status_and_rls.sql.'
      : undefined,
  });

  const statusNames = ['draft', 'saved', 'submitted', 'approved', 'rejected'] as const;
  const statusCounts = await Promise.all(
    statusNames.map(async (status) => {
      const result = await supabaseAdmin
        .from('recordings')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);
      return { status, count: result.error ? null : result.count ?? 0, error: result.error?.message };
    })
  );
  const failedStatus = statusCounts.find((row) => row.count === null);
  dbChecks.push({
    id: 'db.recordingStatuses',
    label: 'Recording statuses (draft → approved)',
    status: failedStatus ? 'fail' : 'ok',
    detail: failedStatus
      ? `Status query failed: ${failedStatus.error}`
      : statusCounts.map((row) => `${row.status}: ${row.count}`).join(' · '),
    hint: failedStatus ? 'The status migration may not have been applied yet.' : undefined,
  });

  const storiesCountResult = await supabaseAdmin.from('stories').select('id', { count: 'exact', head: true });
  dbChecks.push({
    id: 'db.stories',
    label: 'Stories table',
    status: storiesCountResult.error ? 'warn' : 'ok',
    detail: storiesCountResult.error
      ? `stories unavailable: ${storiesCountResult.error.message}`
      : `${storiesCountResult.count ?? 0} stories available.`,
  });

  groups.push({
    id: 'database',
    title: 'Database',
    description: 'Read-only probes against the tables the platform depends on.',
    checks: dbChecks,
  });
  checks.push(...dbChecks);

  // ---------------------------------------------------------------- auth & sign-up
  const authChecks: HealthCheck[] = [];

  const listResult = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listResult.error) {
    authChecks.push({
      id: 'auth.service',
      label: 'Auth service (sign-in / sign-up)',
      status: 'fail',
      detail: `Auth admin API unreachable: ${listResult.error.message}`,
      hint: 'Check the service role key and project URL — the browser signs users in against this same project.',
    });
  } else {
    authUsers = (listResult.data?.users || [])
      .map((user) => ({ id: user.id, created_at: user.created_at }))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    authTotal = listResult.data?.total ?? authUsers.length;

    authChecks.push({
      id: 'auth.service',
      label: 'Auth service (sign-in / sign-up)',
      status: 'ok',
      detail: `Reachable — ${authTotal} accounts registered.`,
    });

    const weekAgo = Date.now() - 7 * 86_400_000;
    const recentSignups = authUsers.filter((user) => {
      const created = new Date(String(user.created_at || '')).getTime();
      return Number.isFinite(created) && created >= weekAgo;
    }).length;
    authChecks.push({
      id: 'auth.signups',
      label: 'Recent sign-ups',
      status: 'ok',
      detail: `${recentSignups} account${recentSignups === 1 ? '' : 's'} created in the last 7 days.`,
    });

    // A sign-up is only complete when the learner profile + points row exist.
    const sample = authUsers.slice(0, 25);
    const sampleIds = sample.map((user) => user.id);
    let missingProfiles = 0;
    if (sampleIds.length) {
      const { data: profiles } = await supabaseAdmin.from('users').select('uid').in('uid', sampleIds);
      const haveProfiles = new Set((profiles || []).map((row) => String(row.uid)));
      missingProfiles = sampleIds.filter((id) => !haveProfiles.has(id)).length;
    }
    authChecks.push({
      id: 'auth.profiles',
      label: 'Sign-up creates a learner profile',
      status: missingProfiles === 0 ? 'ok' : 'warn',
      detail:
        sampleIds.length === 0
          ? 'No accounts to sample yet.'
          : missingProfiles === 0
            ? `Checked the ${sampleIds.length} newest accounts — every one has a users row.`
            : `${missingProfiles} of the ${sampleIds.length} newest accounts have no users row.`,
      hint: missingProfiles === 0 ? undefined : 'Run ensureUserRecords / the signup trigger for affected accounts.',
    });

    const newestUserId = authUsers[0]?.id;
    if (newestUserId) {
      const snapshot = await readAuthoritativePointsSnapshot(newestUserId);
      authChecks.push({
        id: 'points.read',
        label: 'Points read path',
        status: snapshot.hasReliableTotals ? 'ok' : 'fail',
        detail: snapshot.hasReliableTotals
          ? `Newest learner reads back ${snapshot.totalPoints} total / ${snapshot.todayPoints} today (cap 200).`
          : 'Points totals could not be read for the newest learner.',
        hint: snapshot.hasReliableTotals ? undefined : 'Check users_points and users tables for this account.',
      });
    }
  }

  groups.push({
    id: 'auth',
    title: 'Sign-in, sign-up & points',
    description: 'Confirms accounts can register, sign in, and have their points read back.',
    checks: authChecks,
  });
  checks.push(...authChecks);

  // ---------------------------------------------------------------- storage
  const storageChecks: HealthCheck[] = [];
  const bucketResult = await supabaseAdmin.storage.from('story-recordings').list('', { limit: 1 });
  storageChecks.push({
    id: 'storage.bucket',
    label: 'Recording storage',
    status: bucketResult.error ? 'fail' : 'ok',
    detail: bucketResult.error
      ? `Bucket unreachable: ${bucketResult.error.message}`
      : 'story-recordings bucket reachable.',
  });
  storageChecks.push({
    id: 'storage.provider',
    label: 'Storage provider',
    status: 'ok',
    detail: isR2Enabled() ? 'Cloudflare R2 (Supabase Storage fallback available).' : 'Supabase Storage.',
  });
  groups.push({
    id: 'storage',
    title: 'Audio storage',
    description: 'Where recordings are written and streamed from.',
    checks: storageChecks,
  });
  checks.push(...storageChecks);

  const summary = {
    ok: checks.filter((check) => check.status === 'ok').length,
    warn: checks.filter((check) => check.status === 'warn').length,
    fail: checks.filter((check) => check.status === 'fail').length,
    checkedAt: new Date().toISOString(),
    authUserTotal: authTotal,
  };

  return NextResponse.json({ groups, summary }, { headers: { 'Cache-Control': 'no-store' } });
}
