import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateJoinCode } from '@/lib/teams';

export const dynamic = 'force-dynamic';

const isMissingTable = (error: { code?: string; message?: string } | null) =>
  Boolean(error) && (error!.code === '42P01' || /teams|team_members/i.test(String(error!.message || '')));

const sanitizeName = (name: string | null | undefined) => {
  const trimmed = (name ?? '').trim();
  return trimmed || 'Friend';
};

type TeamRow = {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  colour: string | null;
  join_code: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

/** GET: list all teams (with member counts) or, when ?teamId= is given, its roster. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const teamId = String(searchParams.get('teamId') || '').trim();

    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id,name,description,emoji,colour,join_code,is_active,created_at')
      .order('created_at', { ascending: false });

    if (teamsError) {
      if (isMissingTable(teamsError)) {
        return NextResponse.json({ teams: [], setupRequired: true });
      }
      throw teamsError;
    }

    const teamList = (teams || []) as TeamRow[];
    const teamIds = teamList.map((team) => String(team.id));

    const countByTeam = new Map<string, number>();
    if (teamIds.length > 0) {
      const { data: memberRows, error: membersError } = await supabaseAdmin
        .from('team_members')
        .select('team_id,user_id,role')
        .in('team_id', teamIds);

      if (membersError && !isMissingTable(membersError)) throw membersError;

      for (const row of (memberRows || []) as Array<{ team_id: string }>) {
        const id = String(row.team_id);
        countByTeam.set(id, (countByTeam.get(id) || 0) + 1);
      }
    }

    const list = teamList.map((team) => ({
      id: String(team.id),
      name: team.name,
      description: team.description,
      emoji: team.emoji || '🕌',
      colour: team.colour || '#0d9488',
      joinCode: team.join_code || '',
      isActive: team.is_active !== false,
      createdAt: team.created_at,
      memberCount: countByTeam.get(String(team.id)) || 0,
    }));

    if (!teamId) {
      return NextResponse.json({ teams: list });
    }

    const { data: members, error: rosterError } = await supabaseAdmin
      .from('team_members')
      .select('user_id,role,joined_at')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (rosterError && !isMissingTable(rosterError)) throw rosterError;

    const memberRows = (members || []) as Array<{ user_id: string; role: string | null; joined_at: string | null }>;
    const userIds = memberRows.map((row) => String(row.user_id));

    const namesById = new Map<string, string>();
    const pointsById = new Map<string, number>();
    if (userIds.length > 0) {
      const [{ data: userRows }, { data: pointRows }] = await Promise.all([
        supabaseAdmin.from('users').select('uid,name').in('uid', userIds),
        supabaseAdmin.from('users_points').select('user_id,total_points').in('user_id', userIds),
      ]);
      for (const row of (userRows || []) as Array<{ uid: string; name: string | null }>) {
        namesById.set(String(row.uid), sanitizeName(row.name));
      }
      for (const row of (pointRows || []) as Array<{ user_id: string; total_points: number | null }>) {
        pointsById.set(String(row.user_id), Number(row.total_points || 0));
      }
    }

    const roster = memberRows.map((row) => ({
      uid: String(row.user_id),
      name: namesById.get(String(row.user_id)) || 'Friend',
      role: row.role === 'captain' ? 'captain' : 'member',
      joinedAt: row.joined_at,
      totalPoints: pointsById.get(String(row.user_id)) || 0,
    }));

    return NextResponse.json({ teams: list, roster });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[admin/teams GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST: create a team and return its join code. */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const description = String(body?.description || '').trim() || null;
    const emoji = String(body?.emoji || '🕌').trim() || '🕌';
    const colour = String(body?.colour || '#0d9488').trim() || '#0d9488';

    // Retry a few times in case a generated code collides.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const joinCode = generateJoinCode(6);
      const { data, error } = await supabaseAdmin
        .from('teams')
        .insert({ name, description, emoji, colour, join_code: joinCode })
        .select('id,name,description,emoji,colour,join_code,is_active,created_at')
        .single();

      if (!error) {
        return NextResponse.json({ team: data });
      }
      if (error.code === '23505') continue;
      if (isMissingTable(error)) {
        return NextResponse.json(
          { error: 'Teams table is missing. Run the 20261101_create_teams.sql migration in Supabase.', setupRequired: true },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ error: 'Could not generate a unique team code. Try again.' }, { status: 500 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[admin/teams POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH: rename / recolour a team, toggle active, or regenerate its code. */
export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'Team id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body?.name !== undefined) {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Team name cannot be empty' }, { status: 400 });
      updates.name = name;
    }
    if (body?.description !== undefined) updates.description = String(body.description || '').trim() || null;
    if (body?.emoji !== undefined) updates.emoji = String(body.emoji || '🕌').trim() || '🕌';
    if (body?.colour !== undefined) updates.colour = String(body.colour || '#0d9488').trim() || '#0d9488';
    if (body?.isActive !== undefined) updates.is_active = Boolean(body.isActive);
    if (body?.regenerateCode === true) updates.join_code = generateJoinCode(6);

    const { data, error } = await supabaseAdmin
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select('id,name,description,emoji,colour,join_code,is_active,created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Code collision, try again.' }, { status: 409 });
      }
      if (isMissingTable(error)) {
        return NextResponse.json({ error: 'Teams table is missing.', setupRequired: true }, { status: 503 });
      }
      throw error;
    }

    return NextResponse.json({ team: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[admin/teams PATCH]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE: remove a team (its members cascade). */
export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'Team id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('teams').delete().eq('id', id);
    if (error && !isMissingTable(error)) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[admin/teams DELETE]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
