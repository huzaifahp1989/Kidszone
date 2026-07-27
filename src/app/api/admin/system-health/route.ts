import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function verifyAdmin(req: Request) {
  const xAdmin = req.headers.get('x-admin-auth') === 'true';
  if (xAdmin) return true;

  const authHeader = req.headers.get('authorization');
  const secret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  return Boolean(secret && authHeader === `Bearer ${secret}`);
}

export async function GET(req: Request) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checkedAt = new Date().toISOString();

  try {
    const result = {
      checkedAt,
      ok: false,
      supabaseConnection: false,
      usersTable: false,
      usersPointsTable: false,
      pointsColumnsOnUsers: false,
      details: [] as string[],
    };

    const { error: usersHeadError } = await supabaseAdmin
      .from('users')
      .select('uid', { head: true, count: 'exact' });

    if (!usersHeadError) {
      result.supabaseConnection = true;
      result.usersTable = true;
      result.details.push('Supabase connection is healthy.');
      result.details.push('users table is reachable.');
    } else {
      result.details.push(`users table check failed: ${usersHeadError.message}`);
    }

    const { error: usersPointsHeadError } = await supabaseAdmin
      .from('users_points')
      .select('user_id', { head: true, count: 'exact' });

    if (!usersPointsHeadError) {
      result.usersPointsTable = true;
      result.details.push('users_points table is reachable.');
    } else {
      result.details.push(`users_points table check failed: ${usersPointsHeadError.message}`);
    }

    const { error: pointsColsError } = await supabaseAdmin
      .from('users')
      .select('points, weeklypoints, monthlypoints')
      .limit(1);

    if (!pointsColsError) {
      result.pointsColumnsOnUsers = true;
      result.details.push('points columns on users table are available.');
    } else {
      result.details.push(`users points columns check failed: ${pointsColsError.message}`);
    }

    result.ok = Boolean(
      result.supabaseConnection &&
        result.usersTable &&
        result.usersPointsTable &&
        result.pointsColumnsOnUsers
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        checkedAt,
        ok: false,
        supabaseConnection: false,
        usersTable: false,
        usersPointsTable: false,
        pointsColumnsOnUsers: false,
        details: [error?.message || 'Unexpected health check error'],
      },
      { status: 500 }
    );
  }
}
