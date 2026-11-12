import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { resolveBasePoints } from '@/lib/points-policy';
import { levelFromPoints } from '@/lib/levels';
import { DEFAULT_AVATAR_ID, getAvatar } from '@/data/avatars';

export const dynamic = 'force-dynamic';

/** Current lifetime points + level for the authenticated learner (service role). */
async function loadPointsAndLevel(userId: string) {
  const [{ data: pointsRow }, { data: userRow }] = await Promise.all([
    supabaseAdmin.from('users_points').select('total_points').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('users').select('points, avatar_id').eq('uid', userId).maybeSingle(),
  ]);

  const points = resolveBasePoints(pointsRow?.total_points, userRow?.points);
  return {
    points,
    level: levelFromPoints(points),
    avatarId: String(userRow?.avatar_id || '') || DEFAULT_AVATAR_ID,
  };
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserRecords(user.id);
    const { avatarId, level, points } = await loadPointsAndLevel(user.id);

    return NextResponse.json({ avatarId, level, points });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const avatarId = String(body?.avatarId || '').trim();
    const avatar = getAvatar(avatarId);
    if (!avatarId || !avatar) {
      return NextResponse.json({ error: 'Unknown avatar' }, { status: 400 });
    }

    await ensureUserRecords(user.id);
    const { level, points } = await loadPointsAndLevel(user.id);

    if (avatar.unlockLevel > level) {
      return NextResponse.json(
        { error: `Reach level ${avatar.unlockLevel} to unlock ${avatar.name}.` },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_id: avatar.id })
      .eq('uid', user.id);

    if (updateError) {
      if (String(updateError.message || '').includes('does not exist')) {
        return NextResponse.json(
          { error: 'Avatar column is not configured yet. Apply migration 20261028_user_avatars.sql.' },
          { status: 500 }
        );
      }
      throw updateError;
    }

    // Best-effort collection history; never block the selection on it.
    try {
      await supabaseAdmin
        .from('user_avatars')
        .upsert({ user_id: user.id, avatar_id: avatar.id }, { onConflict: 'user_id,avatar_id' });
    } catch {
      /* history table is optional */
    }

    return NextResponse.json({ ok: true, avatarId: avatar.id, level, points });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
