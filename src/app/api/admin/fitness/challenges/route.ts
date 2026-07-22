import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { FITNESS_CHALLENGES_TABLE, isMissingTableError, mapChallenge } from '@/lib/fitness-server';

export const dynamic = 'force-dynamic';

function buildPayload(body: Record<string, unknown>) {
  const p: Record<string, unknown> = {};
  if (body.name != null) p.name = String(body.name).trim();
  if (body.description != null) p.description = String(body.description).trim() || null;
  if (body.goalType != null) p.goal_type = String(body.goalType) === 'minutes' ? 'minutes' : 'steps';
  if (body.goalTarget != null) p.goal_target = Math.max(1, Number(body.goalTarget) || 0);
  if (body.points != null) p.points = Math.max(0, Number(body.points) || 0);
  if (body.ageGroup != null) p.age_group = String(body.ageGroup);
  if (body.active != null) p.active = Boolean(body.active);
  if (body.startDate !== undefined) p.start_date = body.startDate ? String(body.startDate) : null;
  if (body.endDate !== undefined) p.end_date = body.endDate ? String(body.endDate) : null;
  return p;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { data, error } = await supabaseAdmin.from(FITNESS_CHALLENGES_TABLE).select('*').order('created_at', { ascending: false });
    if (error) {
      if (isMissingTableError(error)) return NextResponse.json({ challenges: [], tableMissing: true });
      throw error;
    }
    return NextResponse.json({ challenges: (data || []).map((r) => mapChallenge(r as Record<string, unknown>)) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const p = buildPayload(body);
    if (!p.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    if (!p.goal_type) p.goal_type = 'steps';
    if (p.goal_target == null) p.goal_target = 5000;
    if (p.points == null) p.points = 50;
    const { data, error } = await supabaseAdmin.from(FITNESS_CHALLENGES_TABLE).insert(p).select('*').single();
    if (error) throw error;
    return NextResponse.json({ challenge: mapChallenge(data as Record<string, unknown>) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const p = buildPayload(body);
    p.updated_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from(FITNESS_CHALLENGES_TABLE).update(p).eq('id', id).select('*').single();
    if (error) throw error;
    return NextResponse.json({ challenge: mapChallenge(data as Record<string, unknown>) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const { error } = await supabaseAdmin.from(FITNESS_CHALLENGES_TABLE).delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
