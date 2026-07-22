import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { uploadObject, deleteObject } from '@/lib/object-storage';
import { AUDIO_MAX_FILE_BYTES, extForAudioType, isQuizOpen } from '@/lib/audio-quiz';
import {
  AUDIO_QUIZZES_TABLE,
  AUDIO_QUESTIONS_TABLE,
  AUDIO_SUBMISSIONS_TABLE,
  AUDIO_ANSWERS_TABLE,
  AUDIO_QUIZ_BUCKET,
  ANSWER_AUDIO_PREFIX,
  isMissingTableError,
  mapAudioQuiz,
} from '@/lib/audio-quiz-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const uploadedPaths: string[] = [];
  try {
    const { id: quizId } = await context.params;

    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Please sign in to submit your answer.' }, { status: 401 });

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
        { error: 'You have already submitted for this quiz. Only one entry is allowed.', duplicate: true },
        { status: 409 }
      );
    }

    // Questions for this quiz.
    const { data: questionRows } = await supabaseAdmin
      .from(AUDIO_QUESTIONS_TABLE)
      .select('id')
      .eq('quiz_id', quizId)
      .order('sort_order', { ascending: true });
    const questionIds = (questionRows || []).map((r) => String((r as Record<string, unknown>).id));

    const form = await request.formData();
    const deviceInfo = String(form.get('deviceInfo') || request.headers.get('user-agent') || '').slice(0, 400);

    // Look up name/age for judging + leaderboard display.
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('name, age')
      .eq('uid', user.id)
      .maybeSingle();
    const userName = (userRow as { name?: string } | null)?.name ?? null;
    const age = (userRow as { age?: number } | null)?.age ?? null;

    async function readAnswer(fieldKey: string, durationKey: string) {
      const file = form.get(fieldKey);
      if (!(file instanceof Blob)) return null;
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!buffer.byteLength) throw new Error('One of your recordings is empty.');
      if (buffer.byteLength > AUDIO_MAX_FILE_BYTES) throw new Error('A recording is too large (max 20MB).');
      const mime = (file as File).type || 'audio/webm';
      const ext = extForAudioType(mime);
      if (!ext) throw new Error('Unsupported audio format.');
      return { buffer, mime: mime.split(';')[0].trim().toLowerCase(), ext, duration: Math.round(Number(form.get(durationKey) || 0)) || 0 };
    }

    // Multi-question flow.
    if (questionIds.length > 0) {
      // Ensure every question has an answer file.
      const missing = questionIds.filter((qid) => !(form.get(`answer_${qid}`) instanceof Blob));
      if (missing.length) {
        return NextResponse.json({ error: 'Please record an answer for every question before submitting.' }, { status: 400 });
      }

      const { data: submission, error: subError } = await supabaseAdmin
        .from(AUDIO_SUBMISSIONS_TABLE)
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          user_name: userName,
          age,
          device_info: deviceInfo,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (subError) {
        if (subError.code === '23505') {
          return NextResponse.json({ error: 'You have already submitted for this quiz.', duplicate: true }, { status: 409 });
        }
        throw subError;
      }
      const submissionId = (submission as { id: string }).id;

      let totalDuration = 0;
      for (const qid of questionIds) {
        const ans = await readAnswer(`answer_${qid}`, `duration_${qid}`);
        if (!ans) continue;
        const path = `${ANSWER_AUDIO_PREFIX}/${quizId}/${user.id}/${qid}_${Date.now()}.${ans.ext}`;
        await uploadObject({ bucket: AUDIO_QUIZ_BUCKET, path, body: ans.buffer, contentType: ans.mime });
        uploadedPaths.push(path);
        totalDuration += ans.duration;
        const { error: ansError } = await supabaseAdmin.from(AUDIO_ANSWERS_TABLE).insert({
          submission_id: submissionId,
          quiz_id: quizId,
          question_id: qid,
          user_id: user.id,
          audio_path: path,
          duration_seconds: ans.duration,
        });
        if (ansError) throw ansError;
      }

      await supabaseAdmin.from(AUDIO_SUBMISSIONS_TABLE).update({ duration_seconds: totalDuration }).eq('id', submissionId);

      return NextResponse.json({
        success: true,
        submissionId,
        answers: questionIds.length,
        message: 'MashaAllah! All your answers have been submitted for judging.',
      });
    }

    // Legacy single-question flow (quiz has no question rows).
    const single = await readAnswer('recording', 'duration');
    if (!single) return NextResponse.json({ error: 'A voice recording is required.' }, { status: 400 });
    const path = `${ANSWER_AUDIO_PREFIX}/${quizId}/${user.id}_${Date.now()}.${single.ext}`;
    await uploadObject({ bucket: AUDIO_QUIZ_BUCKET, path, body: single.buffer, contentType: single.mime });
    uploadedPaths.push(path);
    const { error: insertError } = await supabaseAdmin.from(AUDIO_SUBMISSIONS_TABLE).insert({
      quiz_id: quizId,
      user_id: user.id,
      user_name: userName,
      age,
      audio_path: path,
      duration_seconds: single.duration,
      device_info: deviceInfo,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    });
    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already submitted for this quiz.', duplicate: true }, { status: 409 });
      }
      throw insertError;
    }
    return NextResponse.json({ success: true, message: 'MashaAllah! Your answer has been submitted for judging.' });
  } catch (error: unknown) {
    // Best-effort rollback of any uploaded files.
    for (const p of uploadedPaths) {
      try {
        await deleteObject(AUDIO_QUIZ_BUCKET, p);
      } catch {
        /* ignore */
      }
    }
    const message = error instanceof Error ? error.message : 'Failed to submit recording';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
