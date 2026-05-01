import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function getCurrentWeekRangeUtc() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;

  const weekStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
    0,
    0,
    0,
    0
  ));

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  return { weekStartIso: weekStart.toISOString(), weekEndIso: weekEnd.toISOString() };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = (url.searchParams.get('userId') || '').trim();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { weekStartIso, weekEndIso } = getCurrentWeekRangeUtc();

    const { count, error } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('completed_at', weekStartIso)
      .lt('completed_at', weekEndIso);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const attempts = Number(count || 0);
    const minimumRequired = 3;

    return NextResponse.json({
      attempts,
      minimumRequired,
      qualifiedForDraw: attempts >= minimumRequired,
      remainingToQualify: Math.max(0, minimumRequired - attempts),
      weekStart: weekStartIso,
      weekEnd: weekEndIso,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
