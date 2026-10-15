import { NextResponse } from 'next/server';
import { requireMatchingUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || '';
  const authCheck = await requireMatchingUser(request, userId);
  if (!authCheck.ok) return authCheck.response;

  const limit = Math.min(50, Number(url.searchParams.get('limit')) || 12);

  try {
    const { data, error } = await supabaseAdmin
      .from('weekly_certificates')
      .select('*')
      .eq('user_id', authCheck.userId)
      .order('week_start_date', { ascending: false })
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) {
      if (String(error.code) === '42P01') {
        return NextResponse.json({ success: true, certificates: [], count: 0 });
      }
      throw error;
    }

    const countRows = await supabaseAdmin
      .from('weekly_certificates')
      .select('user_id', { count: 'exact', head: false })
      .eq('user_id', authCheck.userId);

    const count = Array.isArray(countRows.data) ? countRows.data.length : 0;

    return NextResponse.json({
      success: true,
      count,
      certificates: (data || []).map((r: any) => ({
        id: r.id,
        weekStart: r.week_start_date,
        rank: r.rank,
        tier: r.tier,
        weeklyPoints: r.weekly_points || 0,
        weeklyActivityCount: r.weekly_activity_count || 0,
        weeklyScore: r.weekly_score || 0,
        badgesAtAward: r.badges_at_award || 0,
        levelAtAward: r.level_at_award || 1,
        issuedAt: r.issued_at || null,
      })),
    });
  } catch (e: any) {
    console.error('[my-weekly-certificates]', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to load certificates.' },
      { status: 500 }
    );
  }
}
