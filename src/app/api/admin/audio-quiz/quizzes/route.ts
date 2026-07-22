import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { clampMaxRecordingSeconds } from '@/lib/audio-quiz';
import { AUDIO_QUIZZES_TABLE, isMissingTableError, mapAudioQuiz } from '@/lib/audio-quiz-server';

export const dynamic = 'force-dynamic';

function buildPayload(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  if (body.title != null) payload.title = String(body.title).trim();
  if (body.description != null) payload.description = String(body.description).trim() || null;
  if (body.category != null) payload.category = String(body.category);
  if (body.ageGroup != null) payload.age_group = String(body.ageGroup);
  if (body.startDate !== undefined) payload.start_date = body.startDate ? String(body.startDate) : null;
  if (body.endDate !== undefined) payload.end_date = body.endDate ? String(body.endDate) : null;
  if (body.prizeDetails != null) payload.prize_details = String(body.prizeDetails).trim() || null;
  if (body.maxRecordingSeconds != null) payload.max_recording_seconds = clampMaxRecordingSeconds(body.maxRecordingSeconds);
  if (body.questionAudioPath !== undefined) payload.question_audio_path = body.questionAudioPath ? String(body.questionAudioPath) : null;
  if (body.questionAudioUrl !== undefined) payload.question_audio_url = body.questionAudioUrl ? String(body.questionAudioUrl) : null;
  if (body.bannerUrl !== undefined) payload.banner_url = body.bannerUrl ? String(body.bannerUrl) : null;
  if (body.winnersCount != null) payload.winners_count = Math.max(1, Math.min(10, Number(body.winnersCount) || 3));
  if (body.active != null) payload.active = Boolean(body.active);
  return payload;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { data, error } = await supabaseAdmin
      .from(AUDIO_QUIZZES_TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingTableError(error)) return NextResponse.json({ quizzes: [], tableMissing: true });
      throw error;
    }
    return NextResponse.json({ quizzes: (data || []).map((r) => mapAudioQuiz(r as Record<string, unknown>)) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const payload = buildPayload(body);
    if (!payload.title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    if (!payload.category) payload.category = 'General Knowledge';
    if (!payload.age_group) payload.age_group = 'All ages';
    if (payload.max_recording_seconds == null) payload.max_recording_seconds = 60;

    const { data, error } = await supabaseAdmin.from(AUDIO_QUIZZES_TABLE).insert(payload).select('*').single();
    if (error) throw error;
    return NextResponse.json({ quiz: mapAudioQuiz(data as Record<string, unknown>) });
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
    const payload = buildPayload(body);
    payload.updated_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from(AUDIO_QUIZZES_TABLE).update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return NextResponse.json({ quiz: mapAudioQuiz(data as Record<string, unknown>) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const { error } = await supabaseAdmin.from(AUDIO_QUIZZES_TABLE).delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
