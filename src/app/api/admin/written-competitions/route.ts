import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { slugifyCompetitionName } from '@/lib/written-competition';
import {
  buildCompetitionPayload,
  isMissingTableError,
  mapCompetition,
  seedRabiUlAwwalCompetition,
  WRITTEN_COMPETITIONS_TABLE,
} from '@/lib/written-competition-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { data, error } = await supabaseAdmin
      .from(WRITTEN_COMPETITIONS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingTableError(error)) return NextResponse.json({ competitions: [], tableMissing: true });
      throw error;
    }
    return NextResponse.json({
      competitions: (data || []).map((row) => mapCompetition(row as Record<string, unknown>)),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.seedRabiUlAwwal) {
      const seeded = await seedRabiUlAwwalCompetition();
      if (seeded.tableMissing) {
        return NextResponse.json({ error: 'Tables are not set up yet.' }, { status: 503 });
      }
      return NextResponse.json({ created: seeded.created, competitionId: seeded.competitionId });
    }

    const payload = buildCompetitionPayload(body);
    if (!payload.name) return NextResponse.json({ error: 'Competition name is required.' }, { status: 400 });
    if (!payload.slug) payload.slug = slugifyCompetitionName(String(payload.name));
    if (payload.active == null) payload.active = true;
    if (payload.question_count == null) payload.question_count = 10;
    if (payload.max_answer_length == null) payload.max_answer_length = 2000;
    if (payload.max_attempts == null) payload.max_attempts = 1;
    if (payload.winners_count == null) payload.winners_count = 1;
    if (payload.category == null) payload.category = 'general';

    const { data, error } = await supabaseAdmin.from(WRITTEN_COMPETITIONS_TABLE).insert(payload).select('*').single();
    if (error) throw error;
    return NextResponse.json({ competition: mapCompetition(data as Record<string, unknown>) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
