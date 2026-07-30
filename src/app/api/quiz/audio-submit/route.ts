import { NextRequest, NextResponse } from 'next/server';
import { buildStorageResponsePayload, deleteObject, uploadObject } from '@/lib/object-storage';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedRequestUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    // Be more lenient with content-type validation - multipart/form-data includes boundary
    if (!contentType.includes('multipart/form-data') && !contentType.includes('multipart')) {
      console.warn('Invalid content-type:', contentType);
      return NextResponse.json({ error: 'Invalid content type. Please use multipart/form-data' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('recording');
    const duration = Number(formData.get('duration') || 0);
    const topicId = String(formData.get('topicId') || '').trim();
    const topicLabel = String(formData.get('topicLabel') || '').trim();
    const questionId = String(formData.get('questionId') || '').trim();
    const questionText = String(formData.get('questionText') || '').trim();
    const story = String(formData.get('story') || '').trim();
    const explanation = String(formData.get('explanation') || '').trim();
    const reference = String(formData.get('reference') || '').trim();
    const correctAnswerIndexRaw = String(formData.get('correctAnswerIndex') || '').trim();
    const correctAnswerText = String(formData.get('correctAnswerText') || '').trim();
    const optionsRaw = String(formData.get('options') || '[]');

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Recording file is required' }, { status: 400 });
    }
    if (!topicId || !topicLabel || !questionId || !questionText) {
      return NextResponse.json({ error: 'Missing quiz question details' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.byteLength) {
      console.error('Audio buffer is empty');
      return NextResponse.json({ error: 'Recording file is empty - please record your answer again' }, { status: 400 });
    }
    if (buffer.byteLength < 1024) {
      console.warn('Audio file is very small:', buffer.byteLength, 'bytes');
      return NextResponse.json({ error: 'Recording is too short. Please record a longer answer' }, { status: 400 });
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
    const filename = `audio-quiz/${authUser.id}/${Date.now()}_${topicId}_${questionId}.${extension}`;

    let parsedOptions: Array<{ index: number; text: string }> = [];
    try {
      const options = JSON.parse(optionsRaw);
      if (Array.isArray(options)) {
        parsedOptions = options
          .map((option, index) => ({
            index: typeof option?.index === 'number' ? option.index : index,
            text: typeof option?.text === 'string' ? option.text : String(option?.text || option || ''),
          }))
          .filter((option) => option.text.trim().length > 0);
      }
    } catch {
      parsedOptions = [];
    }

    try {
      await uploadObject({
        bucket: 'story-recordings',
        path: filename,
        body: buffer,
        contentType: mimeType,
      });
    } catch (uploadError) {
      console.error('Audio quiz storage upload error:', uploadError);
      return NextResponse.json(buildStorageResponsePayload(uploadError), { status: 500 });
    }

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', authUser.id)
      .maybeSingle();

    const metadata = {
      source: 'audio-quiz',
      topicId,
      topicLabel,
      questionId,
      questionText,
      story: story || null,
      options: parsedOptions,
      correctAnswerIndex: correctAnswerIndexRaw === '' ? null : Number(correctAnswerIndexRaw),
      correctAnswerText: correctAnswerText || null,
      explanation: explanation || null,
      reference: reference || null,
    };

    const { data: insertedRecord, error: dbError } = await supabaseAdmin
      .from('recordings')
      .insert({
        user_id: authUser.id,
        story_id: null,
        category: 'audio_quiz',
        child_name: userProfile?.name || null,
        title: `Audio Quiz: ${topicLabel}`,
        description: metadata,
        audio_path: filename,
        duration: Number.isFinite(duration) ? duration : 0,
        status: 'submitted',
        created_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .select('id, status, submitted_at')
      .single();

    if (dbError) {
      try {
        await deleteObject('story-recordings', filename);
      } catch {
        /* ignore */
      }
      return NextResponse.json({ error: dbError.message || 'Failed to save recording' }, { status: 500 });
    }

    return NextResponse.json({ success: true, recording: insertedRecord });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit audio quiz';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
