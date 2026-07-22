import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  CHALLENGE_QUIZZES,
  type ChallengeQuestion,
  type ChallengeQuizKey,
} from '@/data/challenge-quizzes';

export const CHALLENGE_QUESTIONS_TABLE = 'challenge_quiz_questions';
export const CHALLENGE_ATTEMPTS_TABLE = 'challenge_quiz_attempts';

/** Postgres error code raised when a table/relation does not exist yet. */
export const RELATION_MISSING = '42P01';

/**
 * True when an error means the table is not available: either it does not exist
 * (`42P01`) or PostgREST cannot see it in its schema cache yet (`PGRST205`).
 */
export function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}

function mapRow(row: Record<string, unknown>): ChallengeQuestion {
  const accepted = row.accepted_answers;
  return {
    id: String(row.id),
    prompt: String(row.prompt || ''),
    answer: String(row.answer || ''),
    acceptedAnswers: Array.isArray(accepted) ? accepted.map((a) => String(a)) : [],
    explanation: row.explanation ? String(row.explanation) : '',
    isBonus: Boolean(row.is_bonus),
    points: Number(row.points ?? 1) || 1,
  };
}

export interface LoadedQuestions {
  questions: ChallengeQuestion[];
  /** 'db' when questions came from Supabase, 'default' when using the built-in set. */
  source: 'db' | 'default';
}

/**
 * Load the questions for a quiz. Prefers admin-managed rows in Supabase so
 * questions can be edited without shipping the app; falls back to the built-in
 * authentic set when the table is missing or empty.
 */
export async function loadChallengeQuestions(key: ChallengeQuizKey): Promise<LoadedQuestions> {
  const fallback = CHALLENGE_QUIZZES[key].questions;
  try {
    const { data, error } = await supabaseAdmin
      .from(CHALLENGE_QUESTIONS_TABLE)
      .select('*')
      .eq('quiz_key', key)
      .eq('active', true)
      .order('is_bonus', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return { questions: fallback, source: 'default' };
    }
    if (!data || data.length === 0) {
      return { questions: fallback, source: 'default' };
    }
    return { questions: data.map((row) => mapRow(row as Record<string, unknown>)), source: 'db' };
  } catch {
    return { questions: fallback, source: 'default' };
  }
}

/** Fisher-Yates shuffle returning a new array (used to randomise question order per child). */
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
