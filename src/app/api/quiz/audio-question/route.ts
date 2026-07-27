import { NextRequest, NextResponse } from 'next/server';
import {
  buildAudioQuizQuestionRecordingTitle,
  parseAudioQuizQuestionRecordingMetadata,
} from '@/lib/audio-quiz';
import { getReadableObjectUrl } from '@/lib/object-storage';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const topicId = String(request.nextUrl.searchParams.get('topicId') || '').trim();
  const questionId = String(request.nextUrl.searchParams.get('questionId') || '').trim();

  if (!topicId || !questionId) {
    const { data: rows } = await supabaseAdmin
      .from('recordings')
      .select('id, title, description, audio_path, created_at, reviewed_at')
      .eq('category', 'audio_quiz_question')
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200);

    const data = (rows || []).find((row) => {
      const metadata = parseAudioQuizQuestionRecordingMetadata(row?.description ? String(row.description) : null);
      return Boolean(metadata?.active);
    }) || (rows || [])[0] || null;

    if (!data?.audio_path) {
      return NextResponse.json({ error: 'No admin audio quiz question is available yet.', recording: null }, { status: 404 });
    }

    const metadata = parseAudioQuizQuestionRecordingMetadata(data.description ? String(data.description) : null);
    if (!metadata) {
      return NextResponse.json({ error: 'Audio quiz metadata is missing for this recording.', recording: null }, { status: 500 });
    }

    let audioUrl: string | null = null;
    try {
      audioUrl = await getReadableObjectUrl('story-recordings', String(data.audio_path), 3600);
    } catch {
      audioUrl = null;
    }

    return NextResponse.json({
      recording: {
        id: String(data.id),
        audio_url: audioUrl,
        audio_path: String(data.audio_path),
        metadata,
        created_at: data.created_at ? String(data.created_at) : null,
        reviewed_at: data.reviewed_at ? String(data.reviewed_at) : null,
      },
      question: {
        id: metadata.questionId,
        topicId: metadata.topicId,
        topicLabel: metadata.topicLabel,
        question: metadata.questionText,
        question_text: metadata.questionText,
        options: metadata.options,
      },
    });
  }

  const title = buildAudioQuizQuestionRecordingTitle(topicId, questionId);
  const { data } = await supabaseAdmin
    .from('recordings')
    .select('id, title, description, audio_path, created_at, reviewed_at')
    .eq('category', 'audio_quiz_question')
    .eq('title', title)
    .eq('status', 'approved')
    .maybeSingle();

  if (!data?.audio_path) {
    return NextResponse.json({ recording: null });
  }

  let audioUrl: string | null = null;
  try {
    audioUrl = await getReadableObjectUrl('story-recordings', String(data.audio_path), 3600);
  } catch {
    audioUrl = null;
  }

  const metadata = parseAudioQuizQuestionRecordingMetadata(data.description ? String(data.description) : null);

  return NextResponse.json({
    recording: {
      id: String(data.id),
      audio_url: audioUrl,
      audio_path: String(data.audio_path),
      metadata,
      created_at: data.created_at ? String(data.created_at) : null,
      reviewed_at: data.reviewed_at ? String(data.reviewed_at) : null,
    },
    question: metadata
      ? {
          id: metadata.questionId,
          topicId: metadata.topicId,
          topicLabel: metadata.topicLabel,
          question: metadata.questionText,
          question_text: metadata.questionText,
          options: metadata.options,
        }
      : null,
  });
}

