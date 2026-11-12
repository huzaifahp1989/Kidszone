import { supabaseAdmin } from '@/lib/supabase-admin';

export type TeamTab = 'weekly' | 'monthly' | 'lifetime';

export type TeamMemberSummary = {
  uid: string;
  name: string;
  points: number;
  level: number;
  isCaptain: boolean;
};

export type TeamLeaderboardRow = {
  id: string;
  name: string;
  emoji: string;
  colour: string;
  description: string | null;
  memberCount: number;
  totalPoints: number;
  avgPoints: number;
  topMembers: TeamMemberSummary[];
};

export type UserTeam = {
  id: string;
  name: string;
  emoji: string;
  colour: string;
  description: string | null;
  joinCode: string;
  memberCount: number;
  totalPoints: number;
  avgPoints: number;
  isCaptain: boolean;
  members: TeamMemberSummary[];
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

export function generateJoinCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeJoinCode(value: unknown): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

const pointsFieldForTab = (tab: TeamTab): 'weekly_points' | 'monthly_points' | 'total_points' =>
  tab === 'monthly' ? 'monthly_points' : tab === 'lifetime' ? 'total_points' : 'weekly_points';

const sanitizeName = (name: string | null | undefined): string => {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'Friend';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);
  if (isUuid) return 'Friend';
  return trimmed;
};

const firstNameOf = (name: string): string => name.trim().split(/\s+/)[0] || name;

const isMissingTableError = (error: { code?: string; message?: string } | null): boolean => {
  if (!error) return false;
  return error.code === '42P01' || /teams|team_members/i.test(String(error.message || ''));
};

type PointsRow = {
  user_id: string;
  total_points: number | null;
  weekly_points: number | null;
  monthly_points: number | null;
  level: number | null;
};

async function fetchPointsByUser(userIds: string[]): Promise<Map<string, PointsRow>> {
  const map = new Map<string, PointsRow>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return map;

  const { data, error } = await supabaseAdmin
    .from('users_points')
    .select('user_id,total_points,weekly_points,monthly_points,level')
    .in('user_id', unique);

  if (error && error.code !== '42P01') {
    console.warn('[teams] points lookup error:', error.message);
  }

  for (const row of (data || []) as PointsRow[]) {
    map.set(String(row.user_id), row);
  }
  return map;
}

async function fetchNamesByUser(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return map;

  const { data, error } = await supabaseAdmin.from('users').select('uid,name').in('uid', unique);
  if (error && error.code !== '42P01') {
    console.warn('[teams] name lookup error:', error.message);
  }
  for (const row of (data || []) as Array<{ uid: string; name: string | null }>) {
    map.set(String(row.uid), sanitizeName(row.name));
  }
  return map;
}

function pointsFor(row: PointsRow | undefined, field: ReturnType<typeof pointsFieldForTab>): number {
  if (!row) return 0;
  const value = Number((row as Record<string, unknown>)[field] ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Aggregated team standings for the public /teams leaderboard. */
export async function getTeamLeaderboard(tab: TeamTab): Promise<TeamLeaderboardRow[]> {
  const field = pointsFieldForTab(tab);

  const { data: teams, error: teamsError } = await supabaseAdmin
    .from('teams')
    .select('id,name,emoji,colour,description,is_active')
    .eq('is_active', true);

  if (teamsError) {
    if (isMissingTableError(teamsError)) return [];
    throw teamsError;
  }

  const teamList = (teams || []) as Array<{
    id: string;
    name: string;
    emoji: string | null;
    colour: string | null;
    description: string | null;
  }>;
  if (!teamList.length) return [];

  const teamIds = teamList.map((team) => String(team.id));
  const { data: members, error: membersError } = await supabaseAdmin
    .from('team_members')
    .select('team_id,user_id,role')
    .in('team_id', teamIds);

  if (membersError) {
    if (isMissingTableError(membersError)) return [];
    throw membersError;
  }

  const memberRows = (members || []) as Array<{ team_id: string; user_id: string; role: string | null }>;
  const pointsByUser = await fetchPointsByUser(memberRows.map((row) => String(row.user_id)));
  const namesByUser = await fetchNamesByUser(memberRows.map((row) => String(row.user_id)));

  const membersByTeam = new Map<string, Array<{ user_id: string; role: string | null }>>();
  for (const row of memberRows) {
    const teamId = String(row.team_id);
    if (!membersByTeam.has(teamId)) membersByTeam.set(teamId, []);
    membersByTeam.get(teamId)!.push({ user_id: String(row.user_id), role: row.role });
  }

  const rows = teamList.map((team) => {
    const teamId = String(team.id);
    const teamMembers = membersByTeam.get(teamId) || [];
    let total = 0;
    const summaries: TeamMemberSummary[] = teamMembers.map((member) => {
      const points = pointsFor(pointsByUser.get(member.user_id), field);
      total += points;
      return {
        uid: member.user_id,
        name: firstNameOf(namesByUser.get(member.user_id) || 'Friend'),
        points,
        level: Number(pointsByUser.get(member.user_id)?.level ?? 1),
        isCaptain: member.role === 'captain',
      };
    });

    summaries.sort((a, b) => b.points - a.points);
    const memberCount = teamMembers.length;

    return {
      id: teamId,
      name: String(team.name || 'Team'),
      emoji: String(team.emoji || '🕌'),
      colour: String(team.colour || '#0d9488'),
      description: team.description ?? null,
      memberCount,
      totalPoints: total,
      avgPoints: memberCount > 0 ? Math.round((total / memberCount) * 10) / 10 : 0,
      topMembers: summaries.slice(0, 3),
    } satisfies TeamLeaderboardRow;
  });

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.avgPoints !== a.avgPoints) return b.avgPoints - a.avgPoints;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

/** The signed-in learner's team, or null when they have not joined one. */
export async function getUserTeam(userId: string): Promise<UserTeam | null> {
  const uid = String(userId || '').trim();
  if (!uid) return null;

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('team_members')
    .select('team_id,role')
    .eq('user_id', uid)
    .maybeSingle();

  if (membershipError) {
    if (isMissingTableError(membershipError)) return null;
    throw membershipError;
  }
  if (!membership?.team_id) return null;

  const teamId = String(membership.team_id);

  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id,name,emoji,colour,description,join_code')
    .eq('id', teamId)
    .maybeSingle();

  if (teamError) {
    if (isMissingTableError(teamError)) return null;
    throw teamError;
  }
  if (!team) return null;

  const { data: members, error: membersError } = await supabaseAdmin
    .from('team_members')
    .select('user_id,role,joined_at')
    .eq('team_id', teamId);

  if (membersError && !isMissingTableError(membersError)) throw membersError;

  const memberRows = (members || []) as Array<{ user_id: string; role: string | null }>;
  const pointsByUser = await fetchPointsByUser(memberRows.map((row) => String(row.user_id)));
  const namesByUser = await fetchNamesByUser(memberRows.map((row) => String(row.user_id)));

  let total = 0;
  const summaries: TeamMemberSummary[] = memberRows.map((member) => {
    const points = pointsFor(pointsByUser.get(String(member.user_id)), 'total_points');
    total += points;
    return {
      uid: String(member.user_id),
      name: firstNameOf(namesByUser.get(String(member.user_id)) || 'Friend'),
      points,
      level: Number(pointsByUser.get(String(member.user_id))?.level ?? 1),
      isCaptain: member.role === 'captain',
    };
  });

  summaries.sort((a, b) => b.points - a.points);
  const memberCount = memberRows.length;

  return {
    id: teamId,
    name: String(team.name || 'Team'),
    emoji: String(team.emoji || '🕌'),
    colour: String(team.colour || '#0d9488'),
    description: team.description ?? null,
    joinCode: String(team.join_code || ''),
    memberCount,
    totalPoints: total,
    avgPoints: memberCount > 0 ? Math.round((total / memberCount) * 10) / 10 : 0,
    isCaptain: membership.role === 'captain',
    members: summaries,
  };
}
