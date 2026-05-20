import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const checkAdminAuth = (request: Request) => {
  return request.headers.get('x-admin-auth') === 'true';
};

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // year & month are 1-based (e.g. year=2026, month=5 for May)
    // If neither provided, reset all-time durood points.
    const { year, month, preview = false, deletePledgeRecords = false, pledgeType = 'durood' } = body as {
      year?: number;
      month?: number;
      preview?: boolean;
      deletePledgeRecords?: boolean;
      pledgeType?: 'durood' | 'zikr';
    };

    let fromDate: string | null = null;
    let toDate: string | null = null;

    if (year && month) {
      const y = Number(year);
      const m = Number(month);
      fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
      // First day of next month
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? y + 1 : y;
      toDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    }

    // Build pledge query
    let pledgeQuery = supabaseAdmin
      .from('pledges')
      .select('user_id, count')
      .eq('type', pledgeType);

    if (fromDate) pledgeQuery = pledgeQuery.gte('created_at', fromDate);
    if (toDate) pledgeQuery = pledgeQuery.lt('created_at', toDate);

    const { data: pledgeRows, error: pledgeErr } = await pledgeQuery;
    if (pledgeErr) throw pledgeErr;

    if (!pledgeRows || pledgeRows.length === 0) {
      return NextResponse.json({
        success: true,
        preview,
        affected: [],
        message: `No ${pledgeType} pledges found for the selected period.`,
      });
    }

    // Aggregate points per user: floor(count * 0.2)
    const pointsByUser: Record<string, { ptsToRemove: number; recitations: number; pledgeCount: number }> = {};
    for (const row of pledgeRows) {
      const uid = row.user_id as string;
      const cnt = Number(row.count) || 0;
      const pts = Math.floor(cnt * 0.2);
      if (!pointsByUser[uid]) pointsByUser[uid] = { ptsToRemove: 0, recitations: 0, pledgeCount: 0 };
      pointsByUser[uid].ptsToRemove += pts;
      pointsByUser[uid].recitations += cnt;
      pointsByUser[uid].pledgeCount += 1;
    }

    // Fetch current user names/points for preview info
    const userIds = Object.keys(pointsByUser);
    const { data: userRows } = await supabaseAdmin
      .from('users')
      .select('uid, username, name, points')
      .in('uid', userIds);

    const nameMap: Record<string, string> = {};
    const currentPtsMap: Record<string, number> = {};
    for (const u of userRows ?? []) {
      nameMap[u.uid] = u.username || u.name || u.uid;
      currentPtsMap[u.uid] = Number(u.points) || 0;
    }

    const affected = userIds.map((uid) => ({
      userId: uid,
      name: nameMap[uid] || uid,
      pledgeCount: pointsByUser[uid].pledgeCount,
      recitations: pointsByUser[uid].recitations,
      ptsToRemove: pointsByUser[uid].ptsToRemove,
      currentPoints: currentPtsMap[uid] ?? 0,
      newPoints: Math.max(0, (currentPtsMap[uid] ?? 0) - pointsByUser[uid].ptsToRemove),
    }));

    if (preview) {
      return NextResponse.json({ success: true, preview: true, affected });
    }

    // Execute updates
    let usersPointsUpdated = 0;
    let usersUpdated = 0;

    for (const item of affected) {
      // Update users_points.total_points
      const { error: upErr } = await supabaseAdmin.rpc('decrement_total_points', {
        p_user_id: item.userId,
        p_amount: item.ptsToRemove,
      }).maybeSingle();

      // Fallback: direct update if RPC not available
      if (upErr) {
        const { data: upRow } = await supabaseAdmin
          .from('users_points')
          .select('total_points')
          .eq('user_id', item.userId)
          .maybeSingle();

        const current = Number((upRow as any)?.total_points) || 0;
        await supabaseAdmin
          .from('users_points')
          .update({ total_points: Math.max(0, current - item.ptsToRemove) })
          .eq('user_id', item.userId);
      }
      usersPointsUpdated++;

      // Sync users.points snapshot
      await supabaseAdmin
        .from('users')
        .update({ points: item.newPoints })
        .eq('uid', item.userId);
      usersUpdated++;
    }

    const totalPtsRemoved = affected.reduce((s, a) => s + a.ptsToRemove, 0);
    const label = fromDate
      ? `${year}-${String(month).padStart(2, '0')}`
      : 'all-time';

    // Optionally delete the pledge records themselves
    let pledgeRecordsDeleted = 0;
    if (deletePledgeRecords) {
      let deleteQuery = supabaseAdmin
        .from('pledges')
        .delete()
        .eq('type', pledgeType);
      if (fromDate) deleteQuery = deleteQuery.gte('created_at', fromDate);
      if (toDate) deleteQuery = deleteQuery.lt('created_at', toDate);
      const { count, error: delErr } = await deleteQuery;
      if (delErr) throw delErr;
      pledgeRecordsDeleted = count ?? 0;
    }

    return NextResponse.json({
      success: true,
      preview: false,
      affected,
      usersPointsUpdated,
      usersUpdated,
      totalPtsRemoved,
      pledgeRecordsDeleted,
      message: `${pledgeType.charAt(0).toUpperCase() + pledgeType.slice(1)} points removed for ${label}. ${usersPointsUpdated} users updated, ${totalPtsRemoved} points removed.${deletePledgeRecords ? ` ${pledgeRecordsDeleted} pledge records deleted.` : ''}`,
      pledgeType,
    });
  } catch (e: any) {
    console.error('Reset durood points error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
