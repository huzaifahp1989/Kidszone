import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || /weekly_winner_announcements/i.test(String(error.message || ''));
}

function normalizeWeekDate(value: unknown): string | null {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const d = new Date(`${text}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return text;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('weekly_winner_announcements')
      .select('id, winner_name, madrasah_name, week_start_date, created_at')
      .order('week_start_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({
          winners: [],
          setupRequired: true,
          setupSqlPath: 'SETUP_WEEKLY_WINNER_ANNOUNCEMENTS.sql',
        });
      }
      throw error;
    }

    return NextResponse.json({ winners: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const winnerName = String(body?.winnerName || body?.winner_name || '').trim();
    const madrasahName = String(body?.madrasahName || body?.madrasah_name || '').trim() || null;
    const weekStartDate = normalizeWeekDate(body?.weekStartDate ?? body?.week_start_date ?? body?.weekDate);

    if (!winnerName) {
      return NextResponse.json({ error: 'Winner name is required' }, { status: 400 });
    }
    if (!weekStartDate) {
      return NextResponse.json({ error: 'Week date is required (YYYY-MM-DD)' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('weekly_winner_announcements')
      .insert({
        winner_name: winnerName,
        madrasah_name: madrasahName,
        week_start_date: weekStartDate,
      })
      .select('id, winner_name, madrasah_name, week_start_date, created_at')
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error: 'Table weekly_winner_announcements is missing. Run SETUP_WEEKLY_WINNER_ANNOUNCEMENTS.sql in Supabase.',
            setupRequired: true,
          },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ winner: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('weekly_winner_announcements').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
