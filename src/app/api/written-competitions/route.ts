import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isWrittenCompetitionOpen } from '@/lib/written-competition';
import {
  isMissingTableError,
  mapCompetition,
  WRITTEN_COMPETITIONS_TABLE,
} from '@/lib/written-competition-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from(WRITTEN_COMPETITIONS_TABLE)
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingTableError(error)) return NextResponse.json({ competitions: [], tableMissing: true });
      throw error;
    }
    const competitions = (data || [])
      .map((row) => mapCompetition(row as Record<string, unknown>))
      .map((competition) => ({
        ...competition,
        open: isWrittenCompetitionOpen(competition),
      }));
    return NextResponse.json({ competitions });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
