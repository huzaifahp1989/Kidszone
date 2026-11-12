import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserTeam, normalizeJoinCode } from '@/lib/teams';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const code = normalizeJoinCode(body?.joinCode ?? body?.code);
    if (code.length < 4) {
      return NextResponse.json({ error: 'Enter a valid team code.' }, { status: 400 });
    }

    const existing = await getUserTeam(user.id);
    if (existing) {
      return NextResponse.json({ error: 'You are already in a team. Leave it first to join another.' }, { status: 409 });
    }

    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('id,name,is_active')
      .eq('join_code', code)
      .maybeSingle();

    if (teamError) {
      if (teamError.code === '42P01') {
        return NextResponse.json({ error: 'Teams are not set up yet.' }, { status: 503 });
      }
      throw teamError;
    }
    if (!team) {
      return NextResponse.json({ error: 'No team found with that code.' }, { status: 404 });
    }
    if (team.is_active === false) {
      return NextResponse.json({ error: 'That team is no longer accepting members.' }, { status: 403 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: 'member' });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You are already in a team.' }, { status: 409 });
      }
      throw insertError;
    }

    const joined = await getUserTeam(user.id);
    return NextResponse.json({ ok: true, team: joined, teamName: team.name });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[teams/join POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
