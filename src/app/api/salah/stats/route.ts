import { NextResponse } from 'next/server';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO, isValid } from 'date-fns';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { computeSalahStats, normalizeSalahEntryRow } from '@/lib/salah';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function parseDateKey(value: string | null): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  if (!isValid(d)) return null;
  return d;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const range = String(searchParams.get('range') || 'weekly').toLowerCase();
    const anchor = parseDateKey(searchParams.get('date')) || new Date();

    const weekStartsOn: 1 = 1;
    const rangeStart =
      range === 'monthly' ? startOfMonth(anchor) : startOfWeek(anchor, { weekStartsOn });
    const rangeEnd =
      range === 'monthly' ? endOfMonth(anchor) : endOfWeek(anchor, { weekStartsOn });

    const from = rangeStart.toISOString().slice(0, 10);
    const to = rangeEnd.toISOString().slice(0, 10);

    const { data, error } = await supabaseAdmin
      .from('salah_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', from)
      .lte('date', to);

    if (error) throw error;

    const entries = (data || []).map(normalizeSalahEntryRow);
    const stats = computeSalahStats(entries, rangeStart, rangeEnd);

    return NextResponse.json({ stats });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load salah stats' }, { status: 500 });
  }
}

