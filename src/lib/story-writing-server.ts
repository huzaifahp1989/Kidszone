import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  CHAMPION_NOTIFICATION,
  STORY_BADGES,
  ageGroupFromAge,
  assignRanks,
  evaluateStoryBadges,
  monthKey,
  monthRange,
  periodStart,
  publicDisplayName,
  sanitizeBreakdown,
  type LeaderboardPeriod,
  type StoryBadgeKey,
} from '@/lib/story-writing';

export type StoryRow = Record<string, unknown>;

export type ChildInfo = { userId: string; displayName: string; ageGroup: string };

/** Child-safe info only: display name and age group. Never email, full name, school or location. */
export async function loadChildInfo(userIds: string[]): Promise<Map<string, ChildInfo>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const result = new Map<string, ChildInfo>();
  if (!ids.length) return result;

  const { data } = await supabaseAdmin.from('users').select('uid, name, username, age').in('uid', ids);
  for (const row of data || []) {
    const userId = String(row.uid);
    result.set(userId, {
      userId,
      displayName: publicDisplayName(row),
      ageGroup: ageGroupFromAge(row.age),
    });
  }
  for (const id of ids) {
    if (!result.has(id)) result.set(id, { userId: id, displayName: 'Young Writer', ageGroup: 'all' });
  }
  return result;
}

/** Story notification history, mirrored best-effort into the existing user_messages inbox. */
export async function notifyStoryUser(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  storyId?: string | null;
}): Promise<void> {
  await supabaseAdmin.from('story_notifications').insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    story_id: input.storyId ?? null,
  });

  try {
    await supabaseAdmin.from('user_messages').insert({
      user_id: input.userId,
      title: input.title,
      body: input.body,
      url: '/story-writer',
      source: 'system',
      sent_by: 'story-writing',
    });
  } catch {
    /* the inbox table is optional */
  }
}

async function loadApprovedFacts(userId: string) {
  const { data: points } = await supabaseAdmin
    .from('story_points')
    .select('story_id, points, breakdown')
    .eq('user_id', userId)
    .gt('points', 0);

  const storyIds = (points || []).map((row) => String(row.story_id));
  const categories = new Map<string, string | null>();
  if (storyIds.length) {
    const { data: stories } = await supabaseAdmin.from('story_submissions').select('id, category').in('id', storyIds);
    for (const story of stories || []) categories.set(String(story.id), (story.category as string | null) ?? null);
  }

  return (points || []).map((row) => ({
    category: categories.get(String(row.story_id)) ?? null,
    points: Number(row.points) || 0,
    breakdown: sanitizeBreakdown(row.breakdown),
  }));
}

/** Awards any newly earned badges (once each) and returns the keys that were new. */
export async function awardEarnedBadges(userId: string, storyId?: string): Promise<StoryBadgeKey[]> {
  const earned = evaluateStoryBadges(await loadApprovedFacts(userId));
  if (!earned.length) return [];

  const { data: existing } = await supabaseAdmin.from('story_badges').select('badge_key').eq('user_id', userId);
  const have = new Set((existing || []).map((row) => String(row.badge_key)));
  const fresh = earned.filter((key) => !have.has(key));

  for (const key of fresh) {
    const { error } = await supabaseAdmin
      .from('story_badges')
      .insert({ user_id: userId, badge_key: key, story_id: storyId ?? null });
    if (error) continue; // unique(user_id, badge_key): a concurrent request already granted it
    const badge = STORY_BADGES.find((b) => b.key === key);
    await notifyStoryUser({
      userId,
      type: 'badge',
      title: 'New badge',
      body: `${badge?.icon ?? '🏅'} You earned the "${badge?.label ?? key}" badge!`,
      storyId,
    });
  }
  return fresh;
}

type Winner = { rank: number; user_id: string; story_points: number; stories_approved: number };

/**
 * Lazily keeps the monthly competition cycle running: makes sure this month's competition
 * exists and closes any earlier unfinished months (notifying the champion once).
 */
export async function ensureCompetitionCycle(now = new Date()): Promise<string> {
  const currentKey = monthKey(now);
  await supabaseAdmin.rpc('story_ensure_competition', { p_month_key: currentKey });

  const { data: open } = await supabaseAdmin
    .from('monthly_story_competitions')
    .select('month_key')
    .eq('status', 'ACTIVE')
    .lt('month_key', currentKey);

  for (const row of open || []) {
    const { data, error } = await supabaseAdmin.rpc('story_finalize_competition', {
      p_month_key: String(row.month_key),
    });
    const result = data as { finalized?: boolean; winners?: Winner[] } | null;
    if (error || !result?.finalized) continue;

    const champion = (result.winners || []).find((winner) => winner.rank === 1);
    if (champion) {
      await supabaseAdmin
        .from('story_badges')
        .upsert(
          { user_id: champion.user_id, badge_key: 'MONTHLY_WINNER' },
          { onConflict: 'user_id,badge_key', ignoreDuplicates: true }
        );
      await notifyStoryUser({ userId: champion.user_id, type: 'champion', ...CHAMPION_NOTIFICATION });
    }
  }
  return currentKey;
}

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  storyPoints: number;
  storiesApproved: number;
  totalPoints: number;
};

async function totalPointsFor(userIds: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (!userIds.length) return totals;
  const { data } = await supabaseAdmin.from('users_points').select('user_id, total_points').in('user_id', userIds);
  for (const row of data || []) totals.set(String(row.user_id), Number(row.total_points) || 0);
  return totals;
}

async function rankedRows(from: Date | null, to: Date | null, limit: number) {
  const { data, error } = await supabaseAdmin.rpc('story_leaderboard', {
    p_from: from ? from.toISOString() : null,
    p_to: to ? to.toISOString() : null,
    p_limit: limit,
  });
  if (error) throw error;
  return assignRanks(
    ((data || []) as Array<{ user_id: string; story_points: number; stories_approved: number }>).map((row) => ({
      userId: String(row.user_id),
      storyPoints: Number(row.story_points) || 0,
      storiesApproved: Number(row.stories_approved) || 0,
    }))
  );
}

async function decorate(rows: Awaited<ReturnType<typeof rankedRows>>): Promise<LeaderboardEntry[]> {
  const ids = rows.map((row) => row.userId);
  const [info, totals] = await Promise.all([loadChildInfo(ids), totalPointsFor(ids)]);
  return rows.map((row) => ({
    rank: row.rank,
    userId: row.userId,
    displayName: info.get(row.userId)?.displayName ?? 'Young Writer',
    storyPoints: row.storyPoints,
    storiesApproved: row.storiesApproved,
    totalPoints: totals.get(row.userId) ?? 0,
  }));
}

/** Story leaderboard for a period. user ids are returned only so the caller can flag "me", then stripped. */
export async function buildStoryLeaderboard(period: LeaderboardPeriod, viewerId: string | null, limit = 20) {
  const from = periodStart(period);
  const all = await rankedRows(from, null, 1000);
  const top = await decorate(all.slice(0, limit));
  const mine = viewerId ? all.find((row) => row.userId === viewerId) : undefined;
  const me = mine ? (await decorate([mine]))[0] : null;

  return {
    period,
    entries: top.map(({ userId, ...entry }) => ({ ...entry, isMe: userId === viewerId })),
    me: me ? { ...me, userId: undefined } : null,
    totalWriters: all.length,
  };
}

export async function buildCompetitionResults(key: string, viewerId: string | null) {
  const { start, end } = monthRange(key);
  const { data: competition } = await supabaseAdmin
    .from('monthly_story_competitions')
    .select('*')
    .eq('month_key', key)
    .maybeSingle();

  const rows = await rankedRows(start, end, 10);
  // Rank 1-3 use the same tie-break as finalisation so the podium matches the prize winners.
  const entries = (await decorate(rows)).map(({ userId, ...entry }, index) => ({
    ...entry,
    podium: index + 1,
    isMe: userId === viewerId,
  }));

  const { data: prizes } = competition
    ? await supabaseAdmin
        .from('story_prizes')
        .select('id, rank, title, description, winner_user_id, status')
        .eq('competition_id', competition.id)
        .order('rank', { ascending: true })
    : { data: [] };

  return {
    monthKey: key,
    status: (competition?.status as string) ?? 'ACTIVE',
    startsOn: competition?.starts_on ?? start.toISOString().slice(0, 10),
    endsOn: competition?.ends_on ?? null,
    top10: entries,
    prizes: (prizes || []).map((prize) => ({
      id: prize.id,
      rank: prize.rank,
      title: prize.title,
      description: prize.description,
      status: prize.status,
      isMine: Boolean(viewerId && prize.winner_user_id === viewerId),
      hasWinner: Boolean(prize.winner_user_id),
    })),
  };
}

export function mapStory(row: StoryRow, child?: ChildInfo) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    displayName: child?.displayName,
    ageGroup: String(row.age_group ?? child?.ageGroup ?? 'all'),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    islamicLesson: String(row.islamic_lesson ?? ''),
    category: (row.category as string | null) ?? null,
    illustrationUrl: (row.illustration_url as string | null) ?? null,
    challengeId: (row.challenge_id as string | null) ?? null,
    status: String(row.status),
    adminNotes: (row.admin_notes as string | null) ?? null,
    pointsAwarded: Number(row.points_awarded) || 0,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    submittedAt: (row.submitted_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    wordCount: Number(row.word_count) || 0,
    isFlagged: Boolean(row.is_flagged),
    moderationFlags: (row.moderation_flags as string[] | null) ?? [],
  };
}

/** Reads story tables defensively so the UI can show a setup hint before the migration is applied. */
export function isMissingTableError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message || '');
}
