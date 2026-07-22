import { getReadableObjectUrl } from '@/lib/object-storage';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { AudioQuiz } from '@/lib/audio-quiz';
import { TEST_AUDIO_QUIZ, TEST_AUDIO_QUIZ_TITLE } from '@/data/audio-quiz-seed';

export const AUDIO_QUIZZES_TABLE = 'audio_quizzes';
export const AUDIO_QUESTIONS_TABLE = 'audio_quiz_questions';
export const AUDIO_SUBMISSIONS_TABLE = 'audio_submissions';
export const AUDIO_ANSWERS_TABLE = 'audio_answers';
export const AUDIO_WINNERS_TABLE = 'audio_quiz_winners';

/** Storage bucket + path prefixes (reuses the existing story-recordings bucket). */
export const AUDIO_QUIZ_BUCKET = 'story-recordings' as const;
export const QUESTION_AUDIO_PREFIX = 'audio-quiz/questions';
export const ANSWER_AUDIO_PREFIX = 'audio-quiz/answers';

export { isMissingTableError } from '@/lib/challenge-quiz-server';

export function mapAudioQuiz(row: Record<string, unknown>): AudioQuiz {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: row.description ? String(row.description) : '',
    category: String(row.category || 'General Knowledge'),
    ageGroup: String(row.age_group || 'All ages'),
    startDate: row.start_date ? String(row.start_date) : null,
    endDate: row.end_date ? String(row.end_date) : null,
    prizeDetails: row.prize_details ? String(row.prize_details) : '',
    maxRecordingSeconds: Number(row.max_recording_seconds ?? 60) || 60,
    questionAudioUrl: row.question_audio_url ? String(row.question_audio_url) : null,
    questionAudioPath: row.question_audio_path ? String(row.question_audio_path) : null,
    bannerUrl: row.banner_url ? String(row.banner_url) : null,
    winnersCount: Number(row.winners_count ?? 3) || 3,
    active: row.active == null ? true : Boolean(row.active),
    createdAt: row.created_at ? String(row.created_at) : null,
  };
}

export interface AudioQuizQuestion {
  id: string;
  quizId: string;
  sortOrder: number;
  prompt: string;
  audioPath: string | null;
  audioUrl: string | null;
}

export function mapAudioQuestion(row: Record<string, unknown>): AudioQuizQuestion {
  return {
    id: String(row.id),
    quizId: String(row.quiz_id || ''),
    sortOrder: Number(row.sort_order ?? 0),
    prompt: row.prompt ? String(row.prompt) : '',
    audioPath: row.audio_path ? String(row.audio_path) : null,
    audioUrl: row.audio_url ? String(row.audio_url) : null,
  };
}

/** Resolve a fresh playable URL for a stored recording in the audio-quiz bucket. */
export async function resolveAnswerUrl(audioPath: string | null | undefined): Promise<string | null> {
  const path = String(audioPath || '').trim();
  if (!path) return null;
  try {
    return await getReadableObjectUrl(AUDIO_QUIZ_BUCKET, path, 86400);
  } catch {
    return null;
  }
}

/** Insert a ready-to-play test quiz with sample question audio (idempotent). */
export async function seedTestAudioQuiz(): Promise<{
  created: boolean;
  quizId: string;
  questionCount: number;
}> {
  const { data: existingQuiz } = await supabaseAdmin
    .from(AUDIO_QUIZZES_TABLE)
    .select('id')
    .eq('title', TEST_AUDIO_QUIZ_TITLE)
    .maybeSingle();

  let quizId = existingQuiz?.id ? String(existingQuiz.id) : '';

  if (!quizId) {
    const { data: inserted, error } = await supabaseAdmin
      .from(AUDIO_QUIZZES_TABLE)
      .insert({
        title: TEST_AUDIO_QUIZ.title,
        description: TEST_AUDIO_QUIZ.description,
        category: TEST_AUDIO_QUIZ.category,
        age_group: TEST_AUDIO_QUIZ.ageGroup,
        prize_details: TEST_AUDIO_QUIZ.prizeDetails,
        max_recording_seconds: TEST_AUDIO_QUIZ.maxRecordingSeconds,
        winners_count: TEST_AUDIO_QUIZ.winnersCount,
        active: TEST_AUDIO_QUIZ.active,
      })
      .select('id')
      .single();
    if (error || !inserted?.id) {
      throw new Error(error?.message || 'Could not create the test audio quiz.');
    }
    quizId = String(inserted.id);
  }

  const { count } = await supabaseAdmin
    .from(AUDIO_QUESTIONS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId);

  if ((count ?? 0) > 0) {
    return { created: false, quizId, questionCount: Number(count) };
  }

  const rows = TEST_AUDIO_QUIZ.questions.map((q, index) => ({
    quiz_id: quizId,
    prompt: q.prompt,
    audio_url: q.audioUrl,
    audio_path: null,
    sort_order: index,
  }));

  const { error: questionError } = await supabaseAdmin.from(AUDIO_QUESTIONS_TABLE).insert(rows);
  if (questionError) {
    throw new Error(questionError.message || 'Could not add test question audio.');
  }

  return { created: true, quizId, questionCount: rows.length };
}
