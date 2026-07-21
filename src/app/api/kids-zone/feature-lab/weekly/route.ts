import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireMatchingUser } from '@/lib/request-auth';

type WeeklyRow = {
  date: string;
  good_deeds: string[] | null;
  challenge_id: string | null;
};

function titleFromChallengeId(challengeId: string | null): string | null {
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireMatchingUser(request, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;

    const now = new Date();
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 6);

    const startIso = startDate.toISOString().slice(0, 10);
    const endIso = endDate.toISOString().slice(0, 10);

    const { data, error } = await supabaseAdmin
      .from('kids_zone_feature_progress')
      .select('date, good_deeds, challenge_id')
      .eq('user_id', auth.userId)
      .gte('date', startIso)
      .lte('date', endIso)
      .order('date', { ascending: false })
      .returns<WeeklyRow[]>();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []).map((row) => ({
      date: row.date,
      goodDeedsCount: Array.isArray(row.good_deeds) ? row.good_deeds.length : 0,
      challengeId: row.challenge_id,
      challengeTitle: titleFromChallengeId(row.challenge_id),
    }));

    const totalGoodDeeds = rows.reduce((sum, row) => sum + row.goodDeedsCount, 0);
    const challengeDays = rows.reduce((sum, row) => sum + (row.challengeId ? 1 : 0), 0);
    const activeDays = rows.length;

    return NextResponse.json({
      success: true,
      week: {
        startDate: startIso,
        endDate: endIso,
      },
      summary: {
        activeDays,
        totalGoodDeeds,
        challengeDays,
      },
      days: rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
