import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const AGE_GROUPS = ['all', '5-7', '8-10', '11-14'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseChallenge(body: Record<string, unknown>) {
  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  const ageGroup = String(body.ageGroup ?? 'all');
  const startDate = String(body.startDate ?? '');
  const endDate = String(body.endDate ?? '');
  const bonus = Math.trunc(Number(body.bonusPoints ?? 0)) || 0;

  if (!title || title.length > 120) return { error: 'Title is required (max 120 characters).' };
  if (!description || description.length > 1000) return { error: 'Description is required (max 1000 characters).' };
  if (!AGE_GROUPS.includes(ageGroup)) return { error: 'Invalid age group.' };
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate) || endDate < startDate) {
    return { error: 'Please choose a valid start and end date.' };
  }
  if (bonus < 0 || bonus > 100) return { error: 'Bonus points must be between 0 and 100.' };

  return {
    value: {
      title,
      description,
      age_group: ageGroup,
      start_date: startDate,
      end_date: endDate,
      bonus_points: bonus,
      is_active: body.isActive !== false,
    },
  };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('story_challenges')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ challenges: data || [] });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = parseChallenge((await request.json().catch(() => ({}))) as Record<string, unknown>);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('story_challenges').insert(parsed.value).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ challenge: data });
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const parsed = parseChallenge(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('story_challenges')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', String(body.id))
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ challenge: data });
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await supabaseAdmin.from('story_challenges').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
