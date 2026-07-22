import { getReadableObjectUrl } from '@/lib/object-storage';
import type { AudioQuiz } from '@/lib/audio-quiz';

export const AUDIO_QUIZZES_TABLE = 'audio_quizzes';
export const AUDIO_SUBMISSIONS_TABLE = 'audio_submissions';
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

/** Resolve a fresh playable URL for a stored answer recording. */
export async function resolveAnswerUrl(audioPath: string | null | undefined): Promise<string | null> {
  const path = String(audioPath || '').trim();
  if (!path) return null;
  try {
    return await getReadableObjectUrl(AUDIO_QUIZ_BUCKET, path, 86400);
  } catch {
    return null;
  }
}
