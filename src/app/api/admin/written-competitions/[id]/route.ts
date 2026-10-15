import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  buildCompetitionPayload,
  getCompetitionById,
  isMissingTableError,
  mapCompetition,
  WRITTEN_COMPETITIONS_TABLE,
} from '@/lib/written-competition-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const result = await getCompetitionById(id);
    if (result.tableMissing) return NextResponse.json({ error: 'Not set up' }, { status: 503 });
    if (!result.competition) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    return NextResponse.json({ competition: result.competition });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = buildCompetitionPayload(body);
    payload.updated_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from(WRITTEN_COMPETITIONS_TABLE)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      if (isMissingTableError(error)) return NextResponse.json({ error: 'Not set up' }, { status: 503 });
      throw error;
    }
    return NextResponse.json({ competition: mapCompetition(data as Record<string, unknown>) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const { error } = await supabaseAdmin.from(WRITTEN_COMPETITIONS_TABLE).delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
