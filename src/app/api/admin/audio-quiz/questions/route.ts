import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { deleteObject } from '@/lib/object-storage';
import {
  AUDIO_QUESTIONS_TABLE,
  AUDIO_QUIZ_BUCKET,
  isMissingTableError,
  mapAudioQuestion,
  resolveAnswerUrl,
} from '@/lib/audio-quiz-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');
    if (!quizId) return NextResponse.json({ error: 'quizId is required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from(AUDIO_QUESTIONS_TABLE)
      .select('*')
      .eq('quiz_id', quizId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      if (isMissingTableError(error)) return NextResponse.json({ questions: [], tableMissing: true });
      throw error;
    }

    const questions = await Promise.all(
      (data || []).map(async (r) => {
        const q = mapAudioQuestion(r as Record<string, unknown>);
        return { ...q, audioUrl: (await resolveAnswerUrl(q.audioPath)) || q.audioUrl };
      })
    );
    return NextResponse.json({ questions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const quizId = String(body.quizId || '').trim();
    if (!quizId) return NextResponse.json({ error: 'quizId is required' }, { status: 400 });
    if (!body.audioPath && !body.audioUrl) {
      return NextResponse.json({ error: 'Question audio is required.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(AUDIO_QUESTIONS_TABLE)
      .insert({
        quiz_id: quizId,
        prompt: body.prompt ? String(body.prompt).trim() : null,
        audio_path: body.audioPath ? String(body.audioPath) : null,
        audio_url: body.audioUrl ? String(body.audioUrl) : null,
        sort_order: Number(body.sortOrder ?? 0) || 0,
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ question: mapAudioQuestion(data as Record<string, unknown>) });
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

    const { data: existing } = await supabaseAdmin.from(AUDIO_QUESTIONS_TABLE).select('audio_path').eq('id', id).maybeSingle();
    const { error } = await supabaseAdmin.from(AUDIO_QUESTIONS_TABLE).delete().eq('id', id);
    if (error) throw error;

    const path = (existing as { audio_path?: string } | null)?.audio_path;
    if (path) {
      try {
        await deleteObject(AUDIO_QUIZ_BUCKET, path);
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
