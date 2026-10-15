import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import {
  MAX_STORY_POINTS,
  approvalNotification,
  clampStoryPoints,
  REJECTION_NOTIFICATION,
  sanitizeBreakdown,
} from '@/lib/story-writing';
import { awardEarnedBadges, loadChildInfo, mapStory, notifyStoryUser } from '@/lib/story-writing-server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Ctx) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const { data } = await supabaseAdmin.from('story_submissions').select('*').eq('id', id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const info = await loadChildInfo([String(data.user_id)]);

  const { data: points } = await supabaseAdmin
    .from('story_points')
    .select('id, points, reason, breakdown, created_at')
    .eq('story_id', id)
    .maybeSingle();
  return NextResponse.json({ story: mapStory(data, info.get(String(data.user_id))), transaction: points });
}

/** Review actions. Points move only through the atomic story_apply_review RPC (one transaction per story). */
export async function PATCH(request: Request, context: Ctx) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || '');
  const notes = String(body.notes ?? '').trim().slice(0, 2000);

  const { data: story } = await supabaseAdmin
    .from('story_submissions')
    .select('id, user_id, status')
    .eq('id', id)
    .maybeSingle();
  if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'FLAG' || action === 'UNFLAG') {
    const { error } = await supabaseAdmin
      .from('story_submissions')
      .update({ is_flagged: action === 'FLAG', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action !== 'APPROVE' && action !== 'REJECT' && action !== 'REQUEST_CHANGES') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
  if (story.status === 'DRAFT') {
    return NextResponse.json({ error: 'Drafts have not been submitted yet.' }, { status: 409 });
  }

  let points = 0;
  if (action === 'APPROVE') {
    const raw = Number(body.points);
    if (!Number.isFinite(raw) || raw < 0 || raw > MAX_STORY_POINTS) {
      return NextResponse.json({ error: `Points must be between 0 and ${MAX_STORY_POINTS}.` }, { status: 400 });
    }
    points = clampStoryPoints(raw);
  }
  if (action !== 'APPROVE' && !notes) {
    return NextResponse.json({ error: 'Please add feedback for the child.' }, { status: 400 });
  }

  const reviewer = (await getAuthenticatedRequestUser(request))?.email || 'admin';
  const userId = String(story.user_id);
  if (action === 'APPROVE') await ensureUserRecords(userId);

  const { data: result, error } = await supabaseAdmin.rpc('story_apply_review', {
    p_story_id: id,
    p_action: action,
    p_points: points,
    p_notes: notes || null,
    p_reviewer: reviewer,
    p_breakdown: sanitizeBreakdown(body.breakdown),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const outcome = (result || {}) as { delta?: number; was_approved?: boolean; points_awarded?: number };
  // Only notify when something actually changed, so re-saving the same points does not spam the child.
  const changed = action !== 'APPROVE' || !outcome.was_approved || Number(outcome.delta) !== 0 || Boolean(notes);

  if (changed) {
    if (action === 'APPROVE') {
      const msg = approvalNotification(points);
      await notifyStoryUser({
        userId,
        type: 'approved',
        title: msg.title,
        body: notes ? `${msg.body}\n\nFeedback: ${notes}` : msg.body,
        storyId: id,
      });
    } else {
      await notifyStoryUser({
        userId,
        type: action === 'REJECT' ? 'rejected' : 'changes_requested',
        title: REJECTION_NOTIFICATION.title,
        body: `${REJECTION_NOTIFICATION.body}\n\nFeedback: ${notes}`,
        storyId: id,
      });
    }
  }
  const badges = action === 'APPROVE' ? await awardEarnedBadges(userId, id) : [];

  return NextResponse.json({ ok: true, result, newBadges: badges });
}
