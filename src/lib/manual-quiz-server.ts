/**
 * August 2026 Mixed Quiz — MANUAL admin review.
 *
 * Writes:
 *   manual_quiz_submissions (one per child per submit)
 *   manual_quiz_answers     (one per judged question)
 *
 * The challenge quiz metadata + questions are still loaded from the existing
 * CHALLENGE_QUIZZES dictionary / challenge_quiz_questions DB table using the
 * key `aug-2026-mixed`. This module only handles the manual-review flow.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { ensureUserRecords } from '@/lib/ensure-user-records';

export const MANUAL_SUBMISSIONS_TABLE = 'manual_quiz_submissions';
export const MANUAL_ANSWERS_TABLE = 'manual_quiz_answers';

export const MANUAL_QUIZ_STATUSES = ['pending', 'reviewing', 'approved', 'rejected'] as const;
export const MANUAL_ANSWER_STATUSES = [
  'pending',
  'correct',
  'partial',
  'incorrect',
  'skipped',
] as const;

export type ManualQuizStatus = (typeof MANUAL_QUIZ_STATUSES)[number];
export type ManualAnswerStatus = (typeof MANUAL_ANSWER_STATUSES)[number];

export interface ManualQuizAnswerRow {
  id: string;
  submission_id: string;
  question_id: string;
  question_topic: string | null;
  question_prompt: string;
  reference_answer: string | null;
  answer_text: string;
  judge_status: ManualAnswerStatus;
  points_awarded: number;
  max_points: number;
  judge_notes: string | null;
  judged_at: string | null;
  created_at: string | null;
}

export interface ManualQuizSubmissionRow {
  id: string;
  quiz_key: string;
  user_id: string;
  user_name: string | null;
  email: string | null;
  city: string | null;
  age: number | null;
  contact_number: string | null;
  status: ManualQuizStatus;
  points_awarded: number;
  max_points_available: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  device_info: string | null;
  submitted_at: string;
  created_at: string;
}

/** Postgres error codes we explicitly need to handle. */
const RELATION_MISSING = '42P01';

export function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === RELATION_MISSING || error?.code === 'PGRST205';
}

/**
 * Create a submission row + per-question answer rows atomically via the admin
 * client. Throws if the answer map is empty or missing required fields.
 */
export async function createManualSubmission(input: {
  quizKey: string;
  userId: string;
  userName?: string | null;
  email?: string | null;
  city?: string | null;
  age?: number | null;
  contactNumber?: string | null;
  deviceInfo?: string | null;
  maxPointsAvailable: number;
  answers: ReadonlyArray<{
    questionId: string;
    questionTopic?: string | null;
    questionPrompt: string;
    referenceAnswer?: string | null;
    answerText: string;
    maxPoints: number;
  }>;
}): Promise<{ submissionId: string }> {
  if (!input.userId) throw new Error('userId required');
  if (!input.answers || input.answers.length === 0) throw new Error('answers required');

  const {
    data: { user: adminAuthUser },
  } = await supabaseAdmin.auth.admin.getUserById(input.userId);
  const fallbackEmail = adminAuthUser?.email ?? null;
  const metaName = (adminAuthUser?.user_metadata as any)?.name ?? null;
  const metaContact =
    (adminAuthUser?.user_metadata as any)?.contact_number ??
    (adminAuthUser?.user_metadata as any)?.contactNumber ??
    null;
  const metaCity = (adminAuthUser?.user_metadata as any)?.city ?? null;
  const metaAge = (adminAuthUser?.user_metadata as any)?.age ?? null;

  const { data: submissionRow, error: submitError } = await supabaseAdmin
    .from(MANUAL_SUBMISSIONS_TABLE)
    .insert({
      quiz_key: input.quizKey,
      user_id: input.userId,
      user_name: (input.userName || metaName || '').trim() || null,
      email: (input.email || fallbackEmail || '').trim() || null,
      city: (input.city || metaCity || '').trim() || null,
      age: input.age ?? metaAge ?? null,
      contact_number: (input.contactNumber || metaContact || '').trim() || null,
      status: 'pending',
      points_awarded: 0,
      max_points_available: input.maxPointsAvailable,
      device_info: input.deviceInfo ? String(input.deviceInfo).slice(0, 1000) : null,
    })
    .select('id')
    .single();

  if (submitError) {
    throw new Error(`Failed to create manual quiz submission: ${submitError.message} (${submitError.code})`);
  }

  const submissionId = String((submissionRow as any).id);

  const answerRows = input.answers.map((a) => ({
    submission_id: submissionId,
    question_id: a.questionId,
    question_topic: a.questionTopic ? String(a.questionTopic).slice(0, 64) : null,
    question_prompt: String(a.questionPrompt),
    reference_answer: a.referenceAnswer ? String(a.referenceAnswer).slice(0, 2000) : null,
    answer_text: String(a.answerText || '').slice(0, 4000),
    judge_status: 'pending',
    points_awarded: 0,
    max_points: Number(a.maxPoints) || 0,
  }));

  const { error: answersError } = await supabaseAdmin.from(MANUAL_ANSWERS_TABLE).insert(answerRows);

  if (answersError) {
    // Best-effort cleanup: orphan-free deletion if the answers row write fails.
    try {
      await supabaseAdmin.from(MANUAL_SUBMISSIONS_TABLE).delete().eq('id', submissionId);
    } catch {
      /* ignore */
    }
    throw new Error(`Failed to save manual quiz answers: ${answersError.message} (${answersError.code})`);
  }

  return { submissionId };
}

/**
 * Load the list of manual quiz submissions with counts (filters by
 * status/quizKey). Missing tables return { tableMissing: true } so the UI can
 * prompt the admin to run the setup SQL instead of a 500.
 */
export async function listManualSubmissions(filters?: {
  quizKey?: string;
  status?: ManualQuizStatus;
  limit?: number;
}): Promise<{ submissions: ManualQuizSubmissionRow[]; counts: Record<ManualQuizStatus, number>; tableMissing?: boolean }> {
  let query = supabaseAdmin
    .from(MANUAL_SUBMISSIONS_TABLE)
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(Math.min(filters?.limit ?? 500, 500));

  if (filters?.quizKey) query = query.eq('quiz_key', filters.quizKey);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      return {
        submissions: [],
        counts: { pending: 0, reviewing: 0, approved: 0, rejected: 0 },
        tableMissing: true,
      };
    }
    const wrapped = new Error(
      `manual-quiz list: ${error.message}${error.code ? ` (code=${error.code})` : ''}${error.details ? ` — ${error.details}` : ''}`
    ) as Error & { code?: string; details?: string; hint?: string };
    wrapped.code = error.code;
    wrapped.details = error.details;
    wrapped.hint = (error as any).hint;
    throw wrapped;
  }

  const rows = (data || []) as unknown as ManualQuizSubmissionRow[];
  const counts: Record<ManualQuizStatus, number> = {
    pending: 0,
    reviewing: 0,
    approved: 0,
    rejected: 0,
  };
  for (const r of rows) if (r.status in counts) counts[r.status] += 1;

  return { submissions: rows, counts };
}

export async function getManualSubmissionDetail(
  id: string
): Promise<(ManualQuizSubmissionRow & { answers: ManualQuizAnswerRow[] }) | null> {
  const [{ data: sHead, error: sErr }, { data: aRows, error: aErr }] = await Promise.all([
    supabaseAdmin.from(MANUAL_SUBMISSIONS_TABLE).select('*').eq('id', id).maybeSingle(),
    supabaseAdmin.from(MANUAL_ANSWERS_TABLE).select('*').eq('submission_id', id).order('created_at', { ascending: true }),
  ]);
  if (sErr || aErr) {
    throw new Error(`Failed to load manual submission ${id}: ${sErr?.message ?? aErr?.message}`);
  }
  if (!sHead) return null;
  return {
    ...(sHead as unknown as ManualQuizSubmissionRow),
    answers: (aRows || []) as unknown as ManualQuizAnswerRow[],
  };
}

/**
 * Judge a single question — sets status/points/notes on the answer row and
 * then re-rolls up the submission totals. If the user has reached the end of
 * judging (all answers judged non-pending and submission approved), the total
 * points are AWARDED ONCE via awardPointsWithDailyCapByUserId.
 */
export async function judgeManualAnswer(input: {
  submissionId: string;
  answerId: string;
  judgeStatus: ManualAnswerStatus;
  pointsAwarded: number;
  judgeNotes?: string | null;
  judgeUserId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const clampedPoints = Math.max(0, Number(input.pointsAwarded) || 0);

  const { error: patchError } = await supabaseAdmin
    .from(MANUAL_ANSWERS_TABLE)
    .update({
      judge_status: input.judgeStatus,
      points_awarded: clampedPoints,
      judge_notes: input.judgeNotes ? String(input.judgeNotes).slice(0, 2000) : null,
      judged_at: now,
    })
    .eq('id', input.answerId)
    .eq('submission_id', input.submissionId);

  if (patchError) throw new Error(`Failed to judge answer: ${patchError.message}`);
}

/**
 * Finalize a submission: approves/rejects it, rolls up total points, and awards
 * points to the user's profile (awarded only once, never clawed back).
 */
export async function finalizeManualSubmission(input: {
  submissionId: string;
  newStatus: 'approved' | 'rejected' | 'reviewing';
  adminNotes?: string | null;
  judgeUserId: string;
}): Promise<{ submission: ManualQuizSubmissionRow; pointsAwardedNow: number }> {
  // Re-aggregate actual points from the answer rows so the totals are always
  // authoritative regardless of out-of-order judge clicks.
  const { data: answers, error: aErr } = await supabaseAdmin
    .from(MANUAL_ANSWERS_TABLE)
    .select('points_awarded')
    .eq('submission_id', input.submissionId);
  if (aErr) throw new Error(`Failed to aggregate answer points: ${aErr.message}`);
  const pointsTotal = (answers || []).reduce<number>(
    (sum, r) => sum + (Number((r as any).points_awarded) || 0),
    0
  );

  const { data: currentRow, error: curErr } = await supabaseAdmin
    .from(MANUAL_SUBMISSIONS_TABLE)
    .select('*')
    .eq('id', input.submissionId)
    .maybeSingle();
  if (curErr) throw new Error(curErr.message);
  if (!currentRow) throw new Error('Submission not found');
  const cur = currentRow as unknown as ManualQuizSubmissionRow;

  const previousAwarded = Math.max(0, Number(cur.points_awarded) || 0);
  const targetAward = input.newStatus === 'approved' ? pointsTotal : 0;
  // Never claw-back — only award the positive delta on approval.
  const toAwardNow = input.newStatus === 'approved' ? Math.max(0, targetAward - previousAwarded) : 0;

  const patch: Partial<ManualQuizSubmissionRow> & Record<string, unknown> = {
    status: input.newStatus,
    reviewed_by: input.judgeUserId,
    reviewed_at: new Date().toISOString(),
    admin_notes: input.adminNotes ? String(input.adminNotes).slice(0, 4000) : null,
  };
  patch.points_awarded = targetAward;

  let pointsAwardedNow = 0;
  if (toAwardNow > 0 && cur.user_id) {
    await ensureUserRecords(cur.user_id);
    const awardRes = await awardPointsWithDailyCapByUserId(cur.user_id, toAwardNow, {
      countTowardDailyLimit: false,
      successMessage: `+${toAwardNow} points — ${cur.quiz_key} manual quiz!`,
    });
    pointsAwardedNow = awardRes.pointsAwarded;
  }

  const { error: updateErr } = await supabaseAdmin
    .from(MANUAL_SUBMISSIONS_TABLE)
    .update(patch)
    .eq('id', input.submissionId);
  if (updateErr) throw new Error(`Failed to finalize submission: ${updateErr.message}`);

  const refreshed = await getManualSubmissionDetail(input.submissionId);
  if (!refreshed) throw new Error('Submission missing after finalize');
  const { answers: _omitted, ...head } = refreshed;
  void _omitted;
  return { submission: head as ManualQuizSubmissionRow, pointsAwardedNow };
}
