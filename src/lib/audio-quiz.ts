export const AUDIO_QUIZ_CATEGORIES = [
  'Quran',
  'Hadith',
  'Seerah',
  'Islamic History',
  'Fiqh',
  'Duas',
  'General Knowledge',
] as const;

export type AudioQuizCategory = (typeof AUDIO_QUIZ_CATEGORIES)[number];

export const AUDIO_QUIZ_AGE_GROUPS = ['5-7', '8-10', '11-14', 'All ages'] as const;

/** Recording limits (seconds). Admin picks a max within this range. */
export const AUDIO_RECORDING_MIN_SECONDS = 30;
export const AUDIO_RECORDING_MAX_SECONDS = 90;
export const AUDIO_RECORDING_DEFAULT_SECONDS = 60;

/** Uploads must be under 20MB. */
export const AUDIO_MAX_FILE_BYTES = 20 * 1024 * 1024;

export const AUDIO_QUIZ_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type AudioSubmissionStatus = (typeof AUDIO_QUIZ_STATUSES)[number];

export interface AudioQuiz {
  id: string;
  title: string;
  description: string;
  category: string;
  ageGroup: string;
  startDate: string | null;
  endDate: string | null;
  prizeDetails: string;
  maxRecordingSeconds: number;
  questionAudioUrl: string | null;
  bannerUrl: string | null;
  winnersCount: number;
  active: boolean;
  createdAt?: string | null;
}

/** Accepted audio content types for the admin-uploaded question. */
export const QUESTION_AUDIO_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'm4a',
};

/** Extra content types produced by the browser MediaRecorder for child answers. */
export const ANSWER_AUDIO_MIME: Record<string, string> = {
  ...QUESTION_AUDIO_MIME,
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
};

export function extForAudioType(type: string, table: Record<string, string> = ANSWER_AUDIO_MIME): string | null {
  const base = String(type || '').split(';')[0].trim().toLowerCase();
  return table[base] || null;
}

export function clampMaxRecordingSeconds(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return AUDIO_RECORDING_DEFAULT_SECONDS;
  return Math.min(AUDIO_RECORDING_MAX_SECONDS, Math.max(AUDIO_RECORDING_MIN_SECONDS, n));
}

export function isAudioQuizCategory(value: unknown): value is AudioQuizCategory {
  return typeof value === 'string' && (AUDIO_QUIZ_CATEGORIES as readonly string[]).includes(value);
}

/** A quiz is open for submissions when active and within its date window (if set). */
export function isQuizOpen(quiz: { active: boolean; startDate: string | null; endDate: string | null }): boolean {
  if (!quiz.active) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (quiz.startDate && today < quiz.startDate) return false;
  if (quiz.endDate && today > quiz.endDate) return false;
  return true;
}

export function hasQuizEnded(quiz: { endDate: string | null }): boolean {
  if (!quiz.endDate) return false;
  return new Date().toISOString().slice(0, 10) > quiz.endDate;
}
