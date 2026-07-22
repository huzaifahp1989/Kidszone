import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { uploadObject, newAssetPath, deleteObject } from '@/lib/object-storage';
import { AUDIO_MAX_FILE_BYTES, extForAudioType, isQuizOpen } from '@/lib/audio-quiz';
import {
  AUDIO_QUIZZES_TABLE,
  AUDIO_SUBMISSIONS_TABLE,
  AUDIO_QUIZ_BUCKET,
  ANSWER_AUDIO_PREFIX,
  isMissingTableError,
  mapAudioQuiz,
} from '@/lib/audio-quiz-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: quizId } = await context.params;

    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Please sign in to submit your answer.' }, { status: 401 });

    // Load the quiz to validate it is open and enforce the max recording length.
    const { data: quizRow, error: quizError } = await supabaseAdmin
      .from(AUDIO_QUIZZES_TABLE)
      .select('*')
      .eq('id', quizId)
      .maybeSingle();
    if (quizError) {
      if (isMissingTableError(quizError)) {
        return NextResponse.json({ error: 'Audio Quiz is not set up yet.' }, { status: 503 });
      }
      throw quizError;
    }
    if (!quizRow) return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    const quiz = mapAudioQuiz(quizRow as Record<string, unknown>);
    if (!isQuizOpen(quiz)) {
      return NextResponse.json({ error: 'This quiz is closed for submissions.' }, { status: 400 });
    }

    // One submission per child.
    const { data: existing } = await supabaseAdmin
      .from(AUDIO_SUBMISSIONS_TABLE)
      .select('id')
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted an answer for this quiz. Only one entry is allowed.', duplicate: true },
        { status: 409 }
      );
    }

    const form = await request.formData();
    const file = form.get('recording') || form.get('file');
    const durationSeconds = Math.round(Number(form.get('duration') || 0)) || 0;
    const deviceInfo = String(form.get('deviceInfo') || request.headers.get('user-agent') || '').slice(0, 400);

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'A voice recording is required.' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.byteLength) return NextResponse.json({ error: 'Your recording is empty.' }, { status: 400 });
    if (buffer.byteLength > AUDIO_MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Recording is too large (max 20MB).' }, { status: 400 });
    }

    const mime = (file as File).type || 'audio/webm';
    const ext = extForAudioType(mime);
    if (!ext) {
      return NextResponse.json({ error: 'Unsupported audio format.' }, { status: 400 });
    }
    if (durationSeconds > quiz.maxRecordingSeconds + 5) {
      return NextResponse.json(
        { error: `Recording is too long. Maximum is ${quiz.maxRecordingSeconds} seconds.` },
        { status: 400 }
      );
    }

    // Look up name/age for judging + leaderboard display.
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('name, age')
      .eq('uid', user.id)
      .maybeSingle();

    const path = `${ANSWER_AUDIO_PREFIX}/${quizId}/${user.id}_${Date.now()}.${ext}`;
    await uploadObject({
      bucket: AUDIO_QUIZ_BUCKET,
      path,
      body: buffer,
      contentType: mime.split(';')[0].trim().toLowerCase(),
    });

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from(AUDIO_SUBMISSIONS_TABLE)
      .insert({
        quiz_id: quizId,
        user_id: user.id,
        user_name: (userRow as { name?: string } | null)?.name ?? null,
        age: (userRow as { age?: number } | null)?.age ?? null,
        audio_path: path,
        duration_seconds: durationSeconds,
        device_info: deviceInfo,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      // Roll back the uploaded object on failure.
      try {
        await deleteObject(AUDIO_QUIZ_BUCKET, path);
      } catch {
        /* ignore */
      }
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already submitted an answer for this quiz.', duplicate: true },
          { status: 409 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      submissionId: (inserted as { id: string }).id,
      message: 'MashaAllah! Your answer has been submitted for judging.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit recording';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
