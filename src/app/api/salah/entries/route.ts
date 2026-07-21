import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { normalizeSalahEntryRow, SALAH_PRAYERS } from '@/lib/salah';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { SalahPrayerKey, SalahStatus } from '@/types/salah';

export const dynamic = 'force-dynamic';

const prayerKeys = new Set<SalahPrayerKey>(SALAH_PRAYERS.map((p) => p.key));
const statusKeys = new Set<SalahStatus>(['completed', 'missed']);

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = String(searchParams.get('from') || '').trim();
    const to = String(searchParams.get('to') || '').trim();

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to are required (YYYY-MM-DD)' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('salah_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .order('prayer', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ entries: (data || []).map(normalizeSalahEntryRow) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load salah entries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const date = String(body?.date || '').trim();
    const prayer = String(body?.prayer || '').trim() as SalahPrayerKey;
    const status = String(body?.status || '').trim() as SalahStatus;
    const prayedAt = typeof body?.prayedAt === 'string' ? body.prayedAt : null;
    const notes = typeof body?.notes === 'string' ? body.notes : null;

    if (!date) return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 });
    if (!prayerKeys.has(prayer)) return NextResponse.json({ error: 'Invalid prayer' }, { status: 400 });
    if (!statusKeys.has(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const payload = {
      user_id: user.id,
      date,
      prayer,
      status,
      prayed_at: status === 'completed' ? (prayedAt || new Date().toISOString()) : null,
      notes,
    };

    const { data, error } = await supabaseAdmin
      .from('salah_entries')
      .upsert(payload as any, { onConflict: 'user_id,date,prayer' })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ entry: normalizeSalahEntryRow(data) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save salah entry' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const status = typeof body?.status === 'string' ? (body.status.trim() as SalahStatus) : null;
    const prayedAt = typeof body?.prayedAt === 'string' ? body.prayedAt : undefined;
    const notes = typeof body?.notes === 'string' ? body.notes : undefined;

    if (status != null && !statusKeys.has(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const patch: any = {};
    if (status != null) patch.status = status;
    if (prayedAt !== undefined) patch.prayed_at = prayedAt;
    if (notes !== undefined) patch.notes = notes;
    if (status === 'missed') patch.prayed_at = null;
    if (status === 'completed' && patch.prayed_at == null) patch.prayed_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('salah_entries')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ entry: normalizeSalahEntryRow(data) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update salah entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('id') || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabaseAdmin.from('salah_entries').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete salah entry' }, { status: 500 });
  }
}

