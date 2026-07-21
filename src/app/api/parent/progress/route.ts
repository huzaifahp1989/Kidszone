import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type ParentProgressRequest = {
  token?: string;
  childId?: string;
  childEmail?: string;
  parentEmail?: string;
};

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function dayIso(daysAgo = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function challengeTitleFromId(challengeId: string | null): string | null {
  if (!challengeId) return null;
  const map: Record<string, string> = {
    'quiz-starter': 'Quiz Starter Sprint',
    'word-hunt': 'Word Hunt Explorer',
    'durood-focus': 'Durood Focus Minute',
    'leaderboard-climb': 'Leaderboard Climb',
    'bring-a-friend': 'Bring a Friend',
  };
  return map[challengeId] || challengeId;
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function buildProgressPayload(child: { uid: string; name: string | null; email: string | null }) {
  const uid = child.uid;

  const [
    pointsRes,
    quizRes,
    pledgeRes,
    gamesRes,
    certRes,
    featureRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, today_points, badges, level')
      .eq('user_id', uid)
      .maybeSingle(),
    supabaseAdmin
      .from('quiz_attempts')
      .select('completed_at, score')
      .eq('user_id', uid)
      .gte('completed_at', daysAgoIso(30)),
    supabaseAdmin
      .from('pledges')
      .select('created_at, count')
      .eq('user_id', uid)
      .gte('created_at', daysAgoIso(30)),
    supabaseAdmin
      .from('game_progress')
      .select('playedat, points')
      .eq('uid', uid)
      .gte('playedat', daysAgoIso(30)),
    supabaseAdmin
      .from('user_monthly_progress')
      .select('month_start, total_activities, certificate_qualified')
      .eq('user_id', uid)
      .gte('month_start', `${new Date(new Date().getUTCFullYear(), new Date().getUTCMonth() - 11, 1).toISOString().slice(0, 10)}`)
      .order('month_start', { ascending: false }),
    supabaseAdmin
      .from('kids_zone_feature_progress')
      .select('date, good_deeds, challenge_id')
      .eq('user_id', uid)
      .gte('date', dayIso(13))
      .order('date', { ascending: false }),
  ]);

  if (pointsRes.error) throw new Error(pointsRes.error.message);
  if (quizRes.error) throw new Error(quizRes.error.message);
  if (pledgeRes.error) throw new Error(pledgeRes.error.message);
  if (gamesRes.error) throw new Error(gamesRes.error.message);

  const quizRows = quizRes.data || [];
  const pledgeRows = pledgeRes.data || [];
  const gameRows = gamesRes.data || [];
  const certRows = certRes.data || [];
  const featureRows = featureRes.data || [];

  const last7Iso = dayIso(6);

  const weeklyQuizAttempts = quizRows.filter((row) => (row.completed_at || '').slice(0, 10) >= last7Iso).length;
  const monthlyQuizAttempts = quizRows.length;
  const monthlyPledgeLogs = pledgeRows.length;
  const monthlyGameSessions = gameRows.length;

  const featureRecent = featureRows.map((row: any) => ({
    date: row.date,
    goodDeedsCount: Array.isArray(row.good_deeds) ? row.good_deeds.length : 0,
    challengeTitle: challengeTitleFromId(row.challenge_id),
  }));

  const featureWeek = featureRecent.filter((row) => row.date >= last7Iso);

  return {
    success: true,
    child: {
      id: uid,
      name: child.name || 'Child',
      email: child.email || null,
    },
    points: pointsRes.data || {
      total_points: 0,
      weekly_points: 0,
      monthly_points: 0,
      today_points: 0,
      badges: 0,
      level: 1,
    },
    activity: {
      weeklyQuizAttempts,
      monthlyQuizAttempts,
      monthlyPledgeLogs,
      monthlyGameSessions,
    },
    certificates: {
      qualifiedMonths: certRows.filter((row: any) => row.certificate_qualified).length,
      recent: certRows.slice(0, 6),
    },
    featureLab: {
      week: {
        activeDays: featureWeek.length,
        totalGoodDeeds: featureWeek.reduce((sum, row) => sum + row.goodDeedsCount, 0),
        challengeDays: featureWeek.reduce((sum, row) => sum + (row.challengeTitle ? 1 : 0), 0),
      },
      recent: featureRecent.slice(0, 14),
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ParentProgressRequest;
    const token = String(body?.token || '').trim();
    const childId = String(body?.childId || '').trim();
    const childEmail = normalizeEmail(body?.childEmail);
    const parentEmail = normalizeEmail(body?.parentEmail);

    if (token) {
      const tokenHash = hashToken(token);
      const { data: tokenRow, error: tokenError } = await supabaseAdmin
        .from('parent_progress_tokens')
        .select('id, child_user_id, parent_email, expires_at, used_at')
        .eq('token_hash', tokenHash)
        .maybeSingle();

      if (tokenError) {
        return NextResponse.json({ error: tokenError.message }, { status: 500 });
      }

      if (!tokenRow) {
        return NextResponse.json({ error: 'Invalid parent progress link.' }, { status: 403 });
      }

      if (tokenRow.used_at) {
        return NextResponse.json({ error: 'This parent progress link has already been used.' }, { status: 403 });
      }

      if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
        return NextResponse.json({ error: 'This parent progress link has expired.' }, { status: 403 });
      }

      const { data: consumedRow, error: consumeError } = await supabaseAdmin
        .from('parent_progress_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenRow.id)
        .is('used_at', null)
        .select('id')
        .maybeSingle();

      if (consumeError) {
        return NextResponse.json({ error: consumeError.message }, { status: 500 });
      }

      if (!consumedRow) {
        return NextResponse.json({ error: 'This parent progress link is no longer valid.' }, { status: 403 });
      }

      const { data: childFromToken, error: childFromTokenError } = await supabaseAdmin
        .from('users')
        .select('uid, name, email, parent_email')
        .eq('uid', tokenRow.child_user_id)
        .maybeSingle();

      if (childFromTokenError) {
        return NextResponse.json({ error: childFromTokenError.message }, { status: 500 });
      }

      if (!childFromToken) {
        return NextResponse.json({ error: 'Child account not found' }, { status: 404 });
      }

      const savedParent = normalizeEmail(childFromToken.parent_email);
      if (!savedParent || savedParent !== normalizeEmail(tokenRow.parent_email)) {
        return NextResponse.json({ error: 'Parent email no longer matches the child profile.' }, { status: 403 });
      }

      const payload = await buildProgressPayload(childFromToken);
      return NextResponse.json(payload);
    }

    if (!parentEmail) {
      return NextResponse.json({ error: 'parentEmail is required' }, { status: 400 });
    }

    if (!childId && !childEmail) {
      return NextResponse.json({ error: 'Provide childId or childEmail' }, { status: 400 });
    }

    let childQuery = supabaseAdmin
      .from('users')
      .select('uid, name, email, parent_email, reminder_opt_in')
      .limit(1);

    if (childId) {
      childQuery = childQuery.eq('uid', childId);
    } else {
      childQuery = childQuery.eq('email', childEmail);
    }

    const { data: childRow, error: childError } = await childQuery.maybeSingle();

    if (childError) {
      return NextResponse.json({ error: childError.message }, { status: 500 });
    }

    if (!childRow) {
      return NextResponse.json({ error: 'Child account not found' }, { status: 404 });
    }

    const savedParent = normalizeEmail(childRow.parent_email);
    if (!savedParent || savedParent !== parentEmail) {
      return NextResponse.json({ error: 'Parent email does not match this child profile' }, { status: 403 });
    }

    const payload = await buildProgressPayload(childRow);
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
