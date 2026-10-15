import { NextResponse } from 'next/server';
import { requireMatchingUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type Kind = 'weekly' | 'monthly' | 'all';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || '';
  const authCheck = await requireMatchingUser(request, userId);
  if (!authCheck.ok) return authCheck.response;

  const kind = ((url.searchParams.get('kind') || 'all') as string).toLowerCase() as Kind;
  const limit = Math.min(120, Number(url.searchParams.get('limit')) || 30);

  try {
    let weekly: any[] = [];
    let monthly: any[] = [];
    if (kind === 'weekly' || kind === 'all') {
      const { data, error } = await supabaseAdmin
        .from('weekly_certificates')
        .select('*')
        .eq('user_id', authCheck.userId)
        .order('week_start_date', { ascending: false })
        .order('rank', { ascending: true })
        .limit(limit);
      if (error && String(error.code) !== '42P01') throw error;
      weekly = (data || []) as any[];
    }
    if (kind === 'monthly' || kind === 'all') {
      const { data, error } = await supabaseAdmin
        .from('monthly_certificates')
        .select('*')
        .eq('user_id', authCheck.userId)
        .order('month_start_date', { ascending: false })
        .order('rank', { ascending: true })
        .limit(limit);
      if (error && String(error.code) !== '42P01') throw error;
      monthly = (data || []) as any[];
    }

    const count = weekly.length + monthly.length;

    return NextResponse.json({
      success: true,
      count,
      weeklyCount: weekly.length,
      monthlyCount: monthly.length,
      weekly: weekly.map((r) => ({
        kind: 'weekly' as const,
        id: r.id,
        date: r.week_start_date,
        rank: r.rank,
        tier: r.tier,
        category: 'weekly_participation' as const,
        points: r.weekly_points || 0,
        activity: r.weekly_activity_count || 0,
        activeWeeks: 1,
        consecutiveMonths: 0,
        badgesAtAward: r.badges_at_award || 0,
        levelAtAward: r.level_at_award || 1,
        pointsAwarded: 0,
        issuedAt: r.issued_at || null,
        issuedBy: r.issued_by || null,
        userName: r.user_name || null,
      })),
      monthly: monthly.map((r) => ({
        kind: 'monthly' as const,
        id: r.id,
        date: r.month_start_date,
        rank: r.rank,
        tier: r.tier,
        category: (r.category || 'monthly_points') as 'monthly_points' | 'always_active',
        points: r.monthly_points || 0,
        activity: r.monthly_activity_count || 0,
        activeWeeks: r.active_weeks_in_month || 0,
        consecutiveMonths: r.consecutive_active_months || 0,
        badgesAtAward: r.badges_at_award || 0,
        levelAtAward: r.level_at_award || 1,
        pointsAwarded: r.points_awarded || 0,
        issuedAt: r.issued_at || null,
        issuedBy: r.issued_by || null,
        userName: r.user_name || null,
      })),
    });
  } catch (e: any) {
    console.error('[my-certificates]', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to load certificates.' },
      { status: 500 }
    );
  }
}
