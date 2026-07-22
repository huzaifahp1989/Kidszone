import { supabaseAdmin } from '@/lib/supabase-admin';

type QuizAttemptRow = {
  user_id: string;
  quiz_id: string;
  topic?: string | null;
  question_ids?: string[];
  score: number;
  max_score: number;
  duration_seconds?: number;
  is_perfect_score?: boolean;
  is_flagged?: boolean;
  completed_at?: string;
};

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  const message = String(error.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

/** Insert a quiz attempt, retrying with fewer columns when the DB schema is older. */
export async function insertQuizAttempt(row: QuizAttemptRow) {
  const attempts: Array<Record<string, unknown>> = [
    { ...row },
    {
      user_id: row.user_id,
      quiz_id: row.quiz_id,
      score: row.score,
      max_score: row.max_score,
      duration_seconds: row.duration_seconds,
      is_perfect_score: row.is_perfect_score,
      is_flagged: row.is_flagged,
      completed_at: row.completed_at,
    },
    {
      user_id: row.user_id,
      quiz_id: row.quiz_id,
      score: row.score,
      max_score: row.max_score,
      completed_at: row.completed_at,
    },
    {
      user_id: row.user_id,
      quiz_id: row.quiz_id,
      score: row.score,
      completed_at: row.completed_at,
    },
  ];

  let lastError: { code?: string; message?: string } | null = null;

  for (const payload of attempts) {
    const { error } = await supabaseAdmin.from('quiz_attempts').insert(payload);
    if (!error) return { error: null as null };
    lastError = error;
    if (!isMissingColumnError(error)) break;
  }

  return { error: lastError };
}
