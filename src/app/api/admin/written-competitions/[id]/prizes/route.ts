import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { listPrizes, mapPrize, WRITTEN_PRIZES_TABLE } from '@/lib/written-competition-server';

export const dynamic = 'force-dynamic';

function prizePayload(body: Record<string, unknown>) {
  return {
    prize_name: String(body.prizeName || '').trim(),
    prize_description: String(body.prizeDescription || '').trim(),
    prize_image_url: body.prizeImageUrl ? String(body.prizeImageUrl) : null,
    prize_image_path: body.prizeImagePath ? String(body.prizeImagePath) : null,
    sponsor: String(body.sponsor || '').trim(),
    sponsor_logo_url: body.sponsorLogoUrl ? String(body.sponsorLogoUrl) : null,
    winners_count: Math.max(1, Math.min(20, Number(body.winnersCount) || 1)),
    prize_order: Math.max(0, Number(body.prizeOrder) || 0),
    active: body.active == null ? true : Boolean(body.active),
  };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const prizes = await listPrizes(id, false);
    return NextResponse.json({ prizes });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = prizePayload(body);
    if (!payload.prize_name) return NextResponse.json({ error: 'Prize name is required.' }, { status: 400 });
    const { data, error } = await supabaseAdmin
      .from(WRITTEN_PRIZES_TABLE)
      .insert({ ...payload, competition_id: id })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ prize: mapPrize(data as Record<string, unknown>) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const prizeId = String(body.id || '').trim();
    if (!prizeId) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const payload = { ...prizePayload(body), updated_at: new Date().toISOString() };
    const { data, error } = await supabaseAdmin.from(WRITTEN_PRIZES_TABLE).update(payload).eq('id', prizeId).select('*').single();
    if (error) throw error;
    return NextResponse.json({ prize: mapPrize(data as Record<string, unknown>) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await context.params;
  const prizeId = new URL(request.url).searchParams.get('prizeId');
  if (!prizeId) return NextResponse.json({ error: 'prizeId is required' }, { status: 400 });
  try {
    const { error } = await supabaseAdmin.from(WRITTEN_PRIZES_TABLE).delete().eq('id', prizeId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
