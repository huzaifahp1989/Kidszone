import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PRIZE_STATUSES } from '@/lib/story-writing';
import { loadChildInfo } from '@/lib/story-writing-server';

export const dynamic = 'force-dynamic';

/** Prizes for a month (default: latest competitions) with winner display names for the admin. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: competitions, error } = await supabaseAdmin
    .from('monthly_story_competitions')
    .select('*')
    .order('month_key', { ascending: false })
    .limit(12);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (competitions || []).map((c) => c.id);
  const { data: prizes } = ids.length
    ? await supabaseAdmin.from('story_prizes').select('*').in('competition_id', ids).order('rank')
    : { data: [] };

  const winnerIds = Array.from(new Set((prizes || []).map((p) => p.winner_user_id).filter(Boolean).map(String)));
  const info = await loadChildInfo(winnerIds);

  return NextResponse.json({
    competitions: (competitions || []).map((c) => ({
      id: c.id,
      monthKey: c.month_key,
      status: c.status,
      prizes: (prizes || [])
        .filter((p) => p.competition_id === c.id)
        .map((p) => ({
          id: p.id,
          rank: p.rank,
          title: p.title,
          description: p.description,
          status: p.status,
          winnerUserId: p.winner_user_id,
          winnerName: p.winner_user_id ? info.get(String(p.winner_user_id))?.displayName ?? 'Young Writer' : null,
        })),
    })),
  });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const rank = Math.trunc(Number(body.rank));
  const title = String(body.title ?? '').trim();
  if (!body.competitionId || !(rank >= 1 && rank <= 4) || !title || title.length > 120) {
    return NextResponse.json({ error: 'Competition, rank (1-4) and prize title are required.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('story_prizes')
    .insert({
      competition_id: String(body.competitionId),
      rank,
      title,
      description: String(body.description ?? '').trim().slice(0, 500),
    })
    .select('*')
    .single();
  if (error) {
    const dup = error.code === '23505';
    return NextResponse.json(
      { error: dup ? 'That position already has a prize. Edit it instead.' : error.message },
      { status: dup ? 409 : 500 }
    );
  }
  return NextResponse.json({ prize: data });
}

/** Edit prize text and/or move it through Pending -> Sent -> Collected. */
export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!(PRIZE_STATUSES as readonly string[]).includes(String(body.status))) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    update.status = body.status;
    update.status_updated_at = update.updated_at;
  }
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title || title.length > 120) return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
    update.title = title;
  }
  if (body.description !== undefined) update.description = String(body.description).trim().slice(0, 500);

  const { data, error } = await supabaseAdmin
    .from('story_prizes')
    .update(update)
    .eq('id', String(body.id))
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ prize: data });
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await supabaseAdmin.from('story_prizes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
