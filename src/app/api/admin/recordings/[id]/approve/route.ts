import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { isAdminRequest } from '@/lib/admin-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const { points, publish, feedback } = body;
    const requestedPoints = Math.max(0, Number(points) || 0);

    const { data: recording, error: loadError } = await supabaseAdmin
      .from('recordings')
      .select('id, user_id, status, points_awarded')
      .eq('id', id)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }
    if (!recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    let pointsAwarded = 0;
    let awardMessage: string | null = null;
    const alreadyAwarded = Math.max(0, Number(recording.points_awarded || 0));
    const pointsToAward = Math.max(0, requestedPoints - alreadyAwarded);

    if (recording.user_id && pointsToAward > 0) {
      const userId = String(recording.user_id);
      await ensureUserRecords(userId);
      const award = await awardPointsWithDailyCapByUserId(userId, pointsToAward, {
        // Approvals should always credit — do not consume the daily earn budget.
        countTowardDailyLimit: false,
        successMessage: `+${pointsToAward} points for your story recording!`,
        skipEnsureUserRecords: true,
      });

      if (!award.success && award.reason === 'update_failed') {
        return NextResponse.json({ error: award.message }, { status: 500 });
      }

      pointsAwarded = award.pointsAwarded;
      awardMessage = award.message;
    }

    const { error: updateError } = await supabaseAdmin
      .from('recordings')
      .update({
        status: 'approved',
        points_awarded: alreadyAwarded + pointsAwarded,
        admin_notes: feedback,
        is_published: publish,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pointsAwarded, awardMessage });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
