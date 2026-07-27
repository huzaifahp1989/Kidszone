import { NextRequest, NextResponse } from 'next/server';
import {
  buildAudioQuizQuestionRecordingMetadata,
  buildAudioQuizQuestionRecordingTitle,
  parseAudioQuizQuestionRecordingMetadata,
} from '@/lib/audio-quiz';
import { isAdminRequest } from '@/lib/admin-auth';
import { deleteObject, getReadableObjectUrl, uploadObject } from '@/lib/object-storage';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalize(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

async function setOnlyActiveAudioQuestion(recordingId: string) {
  const { data: allRows, error: allRowsError } = await supabaseAdmin
    .from('recordings')
    .select('id, description')
    .eq('category', 'audio_quiz_question');

  if (allRowsError) {
    return { error: allRowsError };
  }

  const updates: Array<Promise<{ error: Error | null }>> = [];

  for (const row of allRows || []) {
    const rowId = String(row.id || '');
    if (!rowId) continue;

    const metadata = parseAudioQuizQuestionRecordingMetadata(row.description ? String(row.description) : null);
    if (!metadata) continue;

    const shouldBeActive = rowId === recordingId;
    const currentlyActive = metadata.active === true;
    if (currentlyActive === shouldBeActive) continue;

    updates.push((async () => {
      const { error } = await supabaseAdmin
        .from('recordings')
        .update({
          description: buildAudioQuizQuestionRecordingMetadata({
            ...metadata,
            active: shouldBeActive,
          }),
        })
        .eq('id', rowId);
      return { error };
    })());
  }

  if (updates.length) {
    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      return { error: failed.error };
    }
  }

  return { error: null };
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const topicId = normalize(request.nextUrl.searchParams.get('topicId'));
  const search = normalize(request.nextUrl.searchParams.get('search'));

  const { data, error } = await supabaseAdmin
    .from('recordings')
    .select('id, title, description, audio_path, created_at, reviewed_at, status')
    .eq('category', 'audio_quiz_question')
    .order('reviewed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const questions = await Promise.all(
    (data || []).map(async (row) => {
      const metadata = parseAudioQuizQuestionRecordingMetadata(row.description ? String(row.description) : null);
      if (!metadata) return null;

      if (topicId && normalize(metadata.topicId) !== topicId) return null;
      if (search) {
        const searchHit =
          normalize(metadata.questionText).includes(search) ||
          normalize(metadata.topicLabel).includes(search);
        if (!searchHit) return null;
      }

      let audio_url: string | null = null;
      if (row.audio_path) {
        try {
          audio_url = await getReadableObjectUrl('story-recordings', String(row.audio_path), 3600);
        } catch {
          audio_url = null;
        }
      }

      return {
        topicId: metadata.topicId,
        topicLabel: metadata.topicLabel,
        questionId: metadata.questionId,
        questionText: metadata.questionText,
        options: metadata.options,
        recording: {
          id: String(row.id),
          audio_path: row.audio_path ? String(row.audio_path) : null,
          audio_url,
          created_at: row.created_at ? String(row.created_at) : null,
          reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
          status: row.status ? String(row.status) : null,
          isActive: metadata.active === true,
        },
      };
    })
  );

  return NextResponse.json({
    questions: questions.filter((item): item is NonNullable<typeof item> => Boolean(item)),
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get('recording');
  const topicId = String(formData.get('topicId') || '').trim();
  const topicLabel = String(formData.get('topicLabel') || '').trim();
  const questionIdRaw = String(formData.get('questionId') || '').trim();
  const questionText = String(formData.get('questionText') || '').trim();
  const duration = Number(formData.get('duration') || 0);
  const setActive = String(formData.get('setActive') || 'true').trim().toLowerCase() !== 'false';
  const optionsRaw = String(formData.get('options') || '[]');

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Recording file is required' }, { status: 400 });
  }
  if (!topicId || !topicLabel || !questionText) {
    return NextResponse.json({ error: 'Question details are required' }, { status: 400 });
  }

  const questionId = questionIdRaw || `admin-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.byteLength) {
    return NextResponse.json({ error: 'Recording is empty' }, { status: 400 });
  }

  let options: string[] = [];
  try {
    const parsed = JSON.parse(optionsRaw);
    if (Array.isArray(parsed)) options = parsed.map(String);
  } catch {
    options = [];
  }

  const uploadedFile = file as File;
  const mimeType = uploadedFile.type || 'audio/webm';
  const extension = mimeType.includes('mp4')
    ? 'm4a'
    : mimeType.includes('mpeg')
      ? 'mp3'
      : mimeType.includes('ogg')
        ? 'ogg'
        : 'webm';

  const title = buildAudioQuizQuestionRecordingTitle(topicId, questionId);
  const filename = `audio-quiz-questions/${topicId}/${questionId}_${Date.now()}.${extension}`;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('recordings')
    .select('id, audio_path, description')
    .eq('category', 'audio_quiz_question')
    .eq('title', title)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existingMetadata = parseAudioQuizQuestionRecordingMetadata(existing?.description ? String(existing.description) : null);
  const existingActive = existingMetadata?.active === true;

  await uploadObject({
    bucket: 'story-recordings',
    path: filename,
    body: buffer,
    contentType: mimeType,
  });

  let savedRecordingId: string | null = null;

  if (existing?.id) {
    savedRecordingId = String(existing.id);
    const { error: updateError } = await supabaseAdmin
      .from('recordings')
      .update({
        description: buildAudioQuizQuestionRecordingMetadata({
          source: 'audio-quiz-question',
          topicId,
          topicLabel,
          questionId,
          questionText,
          options,
          active: setActive ? true : existingActive,
        }),
        audio_path: filename,
        duration: Number.isFinite(duration) ? duration : 0,
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (existing.audio_path) {
      try {
        await deleteObject('story-recordings', String(existing.audio_path));
      } catch {
        /* ignore */
      }
    }
  } else {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('recordings')
      .insert({
        user_id: null,
        story_id: null,
        category: 'audio_quiz_question',
        title,
        description: buildAudioQuizQuestionRecordingMetadata({
          source: 'audio-quiz-question',
          topicId,
          topicLabel,
          questionId,
          questionText,
          options,
          active: setActive,
        }),
        audio_path: filename,
        duration: Number.isFinite(duration) ? duration : 0,
        status: 'approved',
        is_published: false,
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      try {
        await deleteObject('story-recordings', filename);
      } catch {
        /* ignore */
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    savedRecordingId = inserted?.id ? String(inserted.id) : null;
  }

  if (setActive && savedRecordingId) {
    const { error: activeError } = await setOnlyActiveAudioQuestion(savedRecordingId);
    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, recordingId: savedRecordingId });
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const recordingId = String(body?.recordingId || '').trim();
  if (!recordingId) {
    return NextResponse.json({ error: 'recordingId is required' }, { status: 400 });
  }

  const { data: target, error: targetError } = await supabaseAdmin
    .from('recordings')
    .select('id, category, description')
    .eq('id', recordingId)
    .eq('category', 'audio_quiz_question')
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }
  if (!target?.id) {
    return NextResponse.json({ error: 'Audio quiz recording not found' }, { status: 404 });
  }

  const targetMeta = parseAudioQuizQuestionRecordingMetadata(target.description ? String(target.description) : null);
  if (!targetMeta) {
    return NextResponse.json({ error: 'Target recording metadata is invalid' }, { status: 400 });
  }

  const { error: activeError } = await setOnlyActiveAudioQuestion(recordingId);
  if (activeError) {
    return NextResponse.json({ error: activeError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, recordingId });
}

