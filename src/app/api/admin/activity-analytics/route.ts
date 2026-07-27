import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function isMissingVideoTablesError(message: string) {
  const m = message.toLowerCase();
  const mentionsVideoTables = m.includes('video_watch_logs') || m.includes('learning_videos');
  const isMissingTable = m.includes('schema cache') || m.includes('relation') || m.includes('does not exist');
  return mentionsVideoTables && isMissingTable;
}

type Period = 'daily' | 'weekly' | 'monthly';

type UserRow = {
  uid: string;
  name: string | null;
  email: string | null;
};

type AnalyticsRow = {
  uid: string;
  fullName: string;
  email: string;
  quizAttempts: number;
  gameSessions: number;
  pledgeLogs: number;
  videoCompletions: number;
  storyQuizCompletions: number;
  hadithCompletions: number;
  salahCompletions: number;
  topRepeatedQuiz: {
    key: string;
    count: number;
  } | null;
};

function resolveStartIso(period: Period): string {
  const now = new Date();
  if (period === 'daily') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    return start.toISOString();
  }
  if (period === 'weekly') {
    const day = now.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday, 0, 0, 0, 0));
    return start.toISOString();
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  return start.toISOString();
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = (String(searchParams.get('period') || 'daily').toLowerCase() as Period);
    const normalizedPeriod: Period = ['daily', 'weekly', 'monthly'].includes(period) ? period : 'daily';
    const search = String(searchParams.get('search') || '').trim().toLowerCase();

    const startIso = resolveStartIso(normalizedPeriod);
    const today = new Date().toISOString().slice(0, 10);

    const usersQuery = supabaseAdmin
      .from('users')
      .select('uid, name, email')
      .order('name', { ascending: true })
      .limit(500);

    if (search) {
      usersQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error: usersError } = await usersQuery;
    if (usersError) throw usersError;

    const userRows = (users || []) as UserRow[];
    const userIds = userRows.map((u) => u.uid).filter(Boolean);

    if (userIds.length === 0) {
      return NextResponse.json({ rows: [], period: normalizedPeriod });
    }

    const [quizRes, gamesRes, pledgesRes, videosRes] = await Promise.all([
      supabaseAdmin
        .from('quiz_attempts')
        .select('user_id, quiz_id, topic, completed_at')
        .in('user_id', userIds)
        .gte('completed_at', startIso),
      supabaseAdmin
        .from('game_progress')
        .select('uid, gameid, points, playedat')
        .in('uid', userIds)
        .gte('playedat', startIso),
      supabaseAdmin
        .from('pledges')
        .select('user_id, created_at')
        .in('user_id', userIds)
        .gte('created_at', startIso),
      supabaseAdmin
        .from('video_watch_logs')
        .select('user_id, watched_at, watch_date')
        .in('user_id', userIds)
        .gte('watched_at', startIso),
    ]);

    if (quizRes.error) throw quizRes.error;
    if (gamesRes.error) throw gamesRes.error;
    if (pledgesRes.error) throw pledgesRes.error;
    if (videosRes.error) throw videosRes.error;

    const rowsByUser = new Map<string, AnalyticsRow>();
    const repeatedQuizByUser = new Map<string, Map<string, number>>();

    for (const user of userRows) {
      rowsByUser.set(user.uid, {
        uid: user.uid,
        fullName: String(user.name || 'Unknown'),
        email: String(user.email || ''),
        quizAttempts: 0,
        gameSessions: 0,
        pledgeLogs: 0,
        videoCompletions: 0,
        storyQuizCompletions: 0,
        hadithCompletions: 0,
        salahCompletions: 0,
        topRepeatedQuiz: null,
      });
      repeatedQuizByUser.set(user.uid, new Map());
    }

    for (const row of quizRes.data || []) {
      const userId = String((row as { user_id: string }).user_id || '');
      const userRow = rowsByUser.get(userId);
      if (!userRow) continue;
      userRow.quizAttempts += 1;

      const key = String((row as { topic?: string | null }).topic || (row as { quiz_id?: string | null }).quiz_id || 'unknown');
      const userMap = repeatedQuizByUser.get(userId);
      if (!userMap) continue;
      userMap.set(key, Number(userMap.get(key) || 0) + 1);
    }

    for (const row of gamesRes.data || []) {
      const game = row as { uid: string; gameid?: string | null; points?: number | null };
      const userRow = rowsByUser.get(String(game.uid || ''));
      if (!userRow) continue;

      const gameId = String(game.gameid || '');
      const points = Number(game.points || 0);

      if (!gameId.startsWith('activity-') && points > 0) {
        userRow.gameSessions += 1;
        continue;
      }

      if (gameId === 'activity-story-quiz' && points > 0) userRow.storyQuizCompletions += 1;
      if (gameId === 'activity-hadith' && points > 0) userRow.hadithCompletions += 1;
      if (gameId === 'activity-salah' && points > 0) userRow.salahCompletions += 1;
    }

    for (const row of pledgesRes.data || []) {
      const userId = String((row as { user_id: string }).user_id || '');
      const userRow = rowsByUser.get(userId);
      if (!userRow) continue;
      userRow.pledgeLogs += 1;
    }

    for (const row of videosRes.data || []) {
      const userId = String((row as { user_id: string }).user_id || '');
      const userRow = rowsByUser.get(userId);
      if (!userRow) continue;

      if (normalizedPeriod === 'daily') {
        const watchDate = String((row as { watch_date?: string | null }).watch_date || '');
        if (watchDate !== today) continue;
      }

      userRow.videoCompletions += 1;
    }

    for (const [userId, quizMap] of repeatedQuizByUser.entries()) {
      const userRow = rowsByUser.get(userId);
      if (!userRow) continue;
      let topKey = '';
      let topCount = 0;
      for (const [key, count] of quizMap.entries()) {
        if (count > topCount) {
          topKey = key;
          topCount = count;
        }
      }
      if (topCount > 0) {
        userRow.topRepeatedQuiz = {
          key: topKey,
          count: topCount,
        };
      }
    }

    const rows = Array.from(rowsByUser.values()).sort((a, b) => {
      const scoreA = a.quizAttempts + a.gameSessions + a.pledgeLogs + a.videoCompletions;
      const scoreB = b.quizAttempts + b.gameSessions + b.pledgeLogs + b.videoCompletions;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.fullName.localeCompare(b.fullName);
    });

    return NextResponse.json({ rows, period: normalizedPeriod });
  } catch (error: any) {
    if (isMissingVideoTablesError(String(error?.message || ''))) {
      return NextResponse.json(
        {
          error:
            'Missing videos tables. Apply migration supabase/migrations/20260727_learning_videos_and_watch_logs.sql to create learning_videos and video_watch_logs.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
