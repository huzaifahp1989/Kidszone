import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { AUDIO_QUIZ_STATUSES } from '@/lib/audio-quiz';
import {
  AUDIO_SUBMISSIONS_TABLE,
  AUDIO_WINNERS_TABLE,
  isMissingTableError,
  resolveAnswerUrl,
} from '@/lib/audio-quiz-server';

export const dynamic = 'force-dynamic';

function mapSubmission(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    quizId: String(row.quiz_id || ''),
    userId: String(row.user_id || ''),
    userName: row.user_name ? String(row.user_name) : 'Friend',
    age: row.age != null ? Number(row.age) : null,
    audioPath: row.audio_path ? String(row.audio_path) : '',
    durationSeconds: Number(row.duration_seconds ?? 0),
    deviceInfo: row.device_info ? String(row.device_info) : '',
    status: String(row.status || 'pending'),
    place: row.place != null ? Number(row.place) : null,
    judgeNotes: row.judge_notes ? String(row.judge_notes) : '',
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
  };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');
    const status = searchParams.get('status');
    const asCsv = searchParams.get('export') === 'csv';

    let query = supabaseAdmin
      .from(AUDIO_SUBMISSIONS_TABLE)
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(1000);
    if (quizId) query = query.eq('quiz_id', quizId);
    if (status && (AUDIO_QUIZ_STATUSES as readonly string[]).includes(status)) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) return NextResponse.json({ submissions: [], tableMissing: true });
      throw error;
    }

    const rows = (data || []).map((r) => mapSubmission(r as Record<string, unknown>));

    if (asCsv) {
      const header = ['Name', 'Age', 'Status', 'Place', 'Duration(s)', 'Submitted', 'Judge notes', 'Audio path'];
      const lines = rows.map((r) =>
        [
          r.userName,
          r.age ?? '',
          r.status,
          r.place ?? '',
          r.durationSeconds,
          r.submittedAt ?? '',
          (r.judgeNotes || '').replace(/"/g, '""'),
          r.audioPath,
        ]
          .map((v) => `"${String(v)}"`)
          .join(',')
      );
      const csv = [header.join(','), ...lines].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audio-submissions${quizId ? `-${quizId}` : ''}.csv"`,
        },
      });
    }

    // Resolve fresh playable URLs for the admin player.
    const withUrls = await Promise.all(
      rows.map(async (r) => ({ ...r, audioUrl: await resolveAnswerUrl(r.audioPath) }))
    );

    const counts = {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      approved: rows.filter((r) => r.status === 'approved').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
    };

    return NextResponse.json({ submissions: withUrls, counts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const patch: Record<string, unknown> = { reviewed_at: new Date().toISOString() };
    if (body.status != null && (AUDIO_QUIZ_STATUSES as readonly string[]).includes(String(body.status))) {
      patch.status = String(body.status);
    }
    if (body.judgeNotes != null) patch.judge_notes = String(body.judgeNotes).trim() || null;
    const hasPlace = body.place !== undefined;
    let place: number | null = null;
    if (hasPlace) {
      place = body.place == null || body.place === '' ? null : Math.max(1, Math.min(10, Number(body.place)));
      patch.place = place;
    }

    const { data, error } = await supabaseAdmin
      .from(AUDIO_SUBMISSIONS_TABLE)
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    const row = data as Record<string, unknown>;

    // Keep the winners table in sync when a place is assigned/cleared.
    if (hasPlace) {
      const quizId = String(row.quiz_id);
      const userId = String(row.user_id);
      // Remove any existing winner row for this user in this quiz first.
      await supabaseAdmin.from(AUDIO_WINNERS_TABLE).delete().eq('quiz_id', quizId).eq('user_id', userId);
      if (place != null) {
        // Clear whoever previously held this place, then set it.
        await supabaseAdmin.from(AUDIO_WINNERS_TABLE).delete().eq('quiz_id', quizId).eq('place', place);
        await supabaseAdmin.from(AUDIO_WINNERS_TABLE).insert({
          quiz_id: quizId,
          user_id: userId,
          user_name: row.user_name ?? null,
          place,
        });
      }
    }

    return NextResponse.json({ submission: mapSubmission(row) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
