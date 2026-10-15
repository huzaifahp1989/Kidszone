import { supabaseAdmin } from '@/lib/supabase-admin';
import { isMissingTableError } from '@/lib/challenge-quiz-server';
import {
  calculatePercentage,
  DEFAULT_MAX_ANSWER_LENGTH,
  DEFAULT_WRITTEN_SLUG,
  publicDisplayName,
  slugifyCompetitionName,
  toPublicQuestion,
  type WrittenCompetition,
  type WrittenCompetitionCategory,
  type WrittenPrize,
  type WrittenQuestionAdmin,
  type WrittenQuestionDifficulty,
  type WrittenSubmissionStatus,
  type WrittenWinnerStatus,
} from '@/lib/written-competition';
import {
  RABI_UL_AWWAL_CLOSING_DATE,
  RABI_UL_AWWAL_SEED_COMPETITION,
  RABI_UL_AWWAL_SEED_PRIZES,
  RABI_UL_AWWAL_SEED_QUESTIONS,
  RABI_UL_AWWAL_START_DATE,
  RABI_UL_AWWAL_WINNER_ANNOUNCEMENT_DATE,
} from '@/lib/written-competition-seed';

export { isMissingTableError };

export const WRITTEN_COMPETITIONS_TABLE = 'written_competitions';
export const WRITTEN_QUESTIONS_TABLE = 'written_competition_questions';
export const WRITTEN_PRIZES_TABLE = 'written_competition_prizes';
export const WRITTEN_SUBMISSIONS_TABLE = 'written_competition_submissions';
export const WRITTEN_ANSWERS_TABLE = 'written_competition_answers';
export const WRITTEN_WINNERS_TABLE = 'written_competition_winners';

function str(value: unknown, fallback = '') {
  return value == null ? fallback : String(value);
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nullableNum(value: unknown) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function mapCompetition(row: Record<string, unknown>): WrittenCompetition {
  return {
    id: str(row.id),
    slug: str(row.slug),
    name: str(row.name),
    description: str(row.description),
    category: (str(row.category, 'general') as WrittenCompetitionCategory) || 'general',
    rules: str(row.rules),
    prizeInformation: str(row.prize_information),
    startDate: row.start_date ? str(row.start_date) : null,
    closingDate: row.closing_date ? str(row.closing_date) : null,
    winnerAnnouncementDate: row.winner_announcement_date ? str(row.winner_announcement_date) : null,
    questionCount: num(row.question_count, 10),
    maxAnswerLength: num(row.max_answer_length, DEFAULT_MAX_ANSWER_LENGTH),
    minAge: nullableNum(row.min_age),
    maxAttempts: num(row.max_attempts, 1),
    minScoreRequired: num(row.min_score_required, 0),
    winnersCount: num(row.winners_count, 1),
    showWinnersPublicly: Boolean(row.show_winners_publicly),
    active: Boolean(row.active),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function mapQuestionAdmin(row: Record<string, unknown>): WrittenQuestionAdmin {
  return {
    id: str(row.id),
    questionNumber: num(row.question_number, 1),
    questionText: str(row.question_text),
    difficulty: (str(row.difficulty, 'medium') as WrittenQuestionDifficulty) || 'medium',
    topic: str(row.topic),
    maxMarks: num(row.max_marks, 10),
    active: row.active == null ? true : Boolean(row.active),
    expectedAnswer: str(row.expected_answer),
    markingGuidance: str(row.marking_guidance),
    minRequiredPoints: num(row.min_required_points, 0),
    source: str(row.source),
    explanation: str(row.explanation),
  };
}

export { toPublicQuestion };

export function mapPrize(row: Record<string, unknown>): WrittenPrize {
  return {
    id: str(row.id),
    competitionId: str(row.competition_id),
    prizeName: str(row.prize_name),
    prizeDescription: str(row.prize_description),
    prizeImageUrl: row.prize_image_url ? str(row.prize_image_url) : null,
    prizeImagePath: row.prize_image_path ? str(row.prize_image_path) : null,
    sponsor: str(row.sponsor),
    sponsorLogoUrl: row.sponsor_logo_url ? str(row.sponsor_logo_url) : null,
    winnersCount: num(row.winners_count, 1),
    prizeOrder: num(row.prize_order, 0),
    active: row.active == null ? true : Boolean(row.active),
  };
}

export function mapSubmission(row: Record<string, unknown>) {
  return {
    id: str(row.id),
    competitionId: str(row.competition_id),
    userId: str(row.user_id),
    userName: str(row.user_name),
    email: str(row.email),
    city: str(row.city),
    age: nullableNum(row.age),
    contactNumber: str(row.contact_number),
    status: str(row.status, 'pending_review') as WrittenSubmissionStatus,
    totalMarks: num(row.total_marks, 0),
    maxMarks: num(row.max_marks, 0),
    percentage: num(row.percentage, 0),
    adminNotes: str(row.admin_notes),
    reviewedBy: row.reviewed_by ? str(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? str(row.reviewed_at) : null,
    submittedAt: str(row.submitted_at || row.created_at),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function mapAnswer(row: Record<string, unknown>, question?: WrittenQuestionAdmin) {
  return {
    id: str(row.id),
    questionId: str(row.question_id),
    questionNumber: num(row.question_number, question?.questionNumber ?? 0),
    questionText: str(row.question_text, question?.questionText ?? ''),
    answerText: str(row.answer_text),
    maxMarks: num(row.max_marks, question?.maxMarks ?? 10),
    marksAwarded: row.marks_awarded == null ? null : num(row.marks_awarded, 0),
    adminFeedback: str(row.admin_feedback),
    expectedAnswer: question?.expectedAnswer ?? '',
    markingGuidance: question?.markingGuidance ?? '',
    source: question?.source ?? '',
    judgedAt: row.judged_at ? str(row.judged_at) : null,
  };
}

export function mapWinner(row: Record<string, unknown>) {
  return {
    id: str(row.id),
    competitionId: str(row.competition_id),
    prizeId: row.prize_id ? str(row.prize_id) : null,
    submissionId: str(row.submission_id),
    userId: str(row.user_id),
    displayName: str(row.display_name),
    status: str(row.status, 'awaiting_verification') as WrittenWinnerStatus,
    disqualifyReason: str(row.disqualify_reason),
    publicDisplay: Boolean(row.public_display),
    selectedAt: str(row.selected_at),
    confirmedAt: row.confirmed_at ? str(row.confirmed_at) : null,
    confirmedBy: row.confirmed_by ? str(row.confirmed_by) : null,
  };
}

export const WRITTEN_SUBMISSION_ALREADY_EXISTS =
  'You have already submitted this competition. Only one entry is allowed per participant.';

export async function getUserWrittenSubmission(competitionId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from(WRITTEN_SUBMISSIONS_TABLE)
    .select('*')
    .eq('competition_id', competitionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return data ? mapSubmission(data as Record<string, unknown>) : null;
}

export async function getCompetitionBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from(WRITTEN_COMPETITIONS_TABLE)
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return { tableMissing: true as const, competition: null };
    throw error;
  }
  return { tableMissing: false as const, competition: data ? mapCompetition(data as Record<string, unknown>) : null };
}

export async function getCompetitionById(id: string) {
  const { data, error } = await supabaseAdmin.from(WRITTEN_COMPETITIONS_TABLE).select('*').eq('id', id).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return { tableMissing: true as const, competition: null };
    throw error;
  }
  return { tableMissing: false as const, competition: data ? mapCompetition(data as Record<string, unknown>) : null };
}

export async function listActiveQuestions(competitionId: string) {
  const { data, error } = await supabaseAdmin
    .from(WRITTEN_QUESTIONS_TABLE)
    .select('*')
    .eq('competition_id', competitionId)
    .eq('active', true)
    .order('question_number', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => mapQuestionAdmin(row as Record<string, unknown>));
}

export async function listAllQuestions(competitionId: string) {
  const { data, error } = await supabaseAdmin
    .from(WRITTEN_QUESTIONS_TABLE)
    .select('*')
    .eq('competition_id', competitionId)
    .order('question_number', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => mapQuestionAdmin(row as Record<string, unknown>));
}

export async function listPrizes(competitionId: string, activeOnly = false) {
  let query = supabaseAdmin
    .from(WRITTEN_PRIZES_TABLE)
    .select('*')
    .eq('competition_id', competitionId)
    .order('prize_order', { ascending: true });
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => mapPrize(row as Record<string, unknown>));
}

export async function recalculateSubmission(submissionId: string) {
  const { data: answers, error } = await supabaseAdmin
    .from(WRITTEN_ANSWERS_TABLE)
    .select('marks_awarded, max_marks')
    .eq('submission_id', submissionId);
  if (error) throw error;

  const rows = answers || [];
  const maxMarks = rows.reduce((sum, row) => sum + num(row.max_marks, 0), 0);
  const totalMarks = rows.reduce((sum, row) => sum + (row.marks_awarded == null ? 0 : num(row.marks_awarded, 0)), 0);
  const allMarked = rows.length > 0 && rows.every((row) => row.marks_awarded != null);
  const percentage = calculatePercentage(totalMarks, maxMarks);

  const { data: current, error: currentError } = await supabaseAdmin
    .from(WRITTEN_SUBMISSIONS_TABLE)
    .select('status')
    .eq('id', submissionId)
    .maybeSingle();
  if (currentError) throw currentError;

  const status = String(current?.status || 'pending_review');
  const nextStatus =
    allMarked && (status === 'pending_review' || status === 'under_review') ? 'reviewed' : status;

  const { data, error: updateError } = await supabaseAdmin
    .from(WRITTEN_SUBMISSIONS_TABLE)
    .update({
      total_marks: totalMarks,
      max_marks: maxMarks,
      percentage,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .select('*')
    .single();
  if (updateError) throw updateError;
  return mapSubmission(data as Record<string, unknown>);
}

export function buildCompetitionPayload(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  if (body.name != null) payload.name = str(body.name).trim();
  if (body.slug != null) payload.slug = slugifyCompetitionName(str(body.slug) || str(body.name));
  if (body.description != null) payload.description = str(body.description).trim();
  if (body.category != null) payload.category = str(body.category).trim() || 'general';
  if (body.rules != null) payload.rules = str(body.rules);
  if (body.prizeInformation != null) payload.prize_information = str(body.prizeInformation);
  if (body.startDate !== undefined) payload.start_date = body.startDate ? str(body.startDate) : null;
  if (body.closingDate !== undefined) payload.closing_date = body.closingDate ? str(body.closingDate) : null;
  if (body.winnerAnnouncementDate !== undefined) {
    payload.winner_announcement_date = body.winnerAnnouncementDate ? str(body.winnerAnnouncementDate) : null;
  }
  if (body.questionCount != null) payload.question_count = Math.max(1, Math.min(50, num(body.questionCount, 10)));
  if (body.maxAnswerLength != null) {
    payload.max_answer_length = Math.max(200, Math.min(8000, num(body.maxAnswerLength, DEFAULT_MAX_ANSWER_LENGTH)));
  }
  if (body.minAge !== undefined) payload.min_age = body.minAge === '' || body.minAge == null ? null : num(body.minAge);
  if (body.maxAttempts != null) payload.max_attempts = 1;
  if (body.minScoreRequired != null) payload.min_score_required = Math.max(0, num(body.minScoreRequired, 0));
  if (body.winnersCount != null) payload.winners_count = Math.max(1, Math.min(50, num(body.winnersCount, 1)));
  if (body.showWinnersPublicly != null) payload.show_winners_publicly = Boolean(body.showWinnersPublicly);
  if (body.active != null) payload.active = Boolean(body.active);
  return payload;
}

export async function seedRabiUlAwwalCompetition() {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from(WRITTEN_COMPETITIONS_TABLE)
    .select('id, slug, start_date, closing_date, winner_announcement_date, active, max_attempts')
    .eq('slug', DEFAULT_WRITTEN_SLUG)
    .maybeSingle();
  if (existingError) {
    if (isMissingTableError(existingError)) return { tableMissing: true as const, created: false, competitionId: null };
    throw existingError;
  }

  const fixedStartDate = RABI_UL_AWWAL_START_DATE;
  const fixedClosingDate = RABI_UL_AWWAL_CLOSING_DATE;
  const fixedWinnerAnnouncementDate = RABI_UL_AWWAL_WINNER_ANNOUNCEMENT_DATE;

  let competitionId = existing?.id ? str(existing.id) : '';
  let created = false;

  if (!competitionId) {
    const { data, error } = await supabaseAdmin
      .from(WRITTEN_COMPETITIONS_TABLE)
      .insert({
        slug: RABI_UL_AWWAL_SEED_COMPETITION.slug,
        name: RABI_UL_AWWAL_SEED_COMPETITION.name,
        description: RABI_UL_AWWAL_SEED_COMPETITION.description,
        category: RABI_UL_AWWAL_SEED_COMPETITION.category,
        rules: RABI_UL_AWWAL_SEED_COMPETITION.rules,
        prize_information: RABI_UL_AWWAL_SEED_COMPETITION.prizeInformation,
        start_date: fixedStartDate,
        closing_date: fixedClosingDate,
        winner_announcement_date: fixedWinnerAnnouncementDate,
        question_count: RABI_UL_AWWAL_SEED_COMPETITION.questionCount,
        max_answer_length: RABI_UL_AWWAL_SEED_COMPETITION.maxAnswerLength,
        min_age: RABI_UL_AWWAL_SEED_COMPETITION.minAge,
        max_attempts: RABI_UL_AWWAL_SEED_COMPETITION.maxAttempts,
        min_score_required: RABI_UL_AWWAL_SEED_COMPETITION.minScoreRequired,
        winners_count: RABI_UL_AWWAL_SEED_COMPETITION.winnersCount,
        show_winners_publicly: RABI_UL_AWWAL_SEED_COMPETITION.showWinnersPublicly,
        active: true,
      })
      .select('id')
      .single();
    if (error) throw error;
    competitionId = str(data.id);
    created = true;
  } else if (existing) {
    const needsDateFix =
      String(existing.start_date ?? '') !== fixedStartDate ||
      String(existing.closing_date ?? '') !== fixedClosingDate ||
      String(existing.winner_announcement_date ?? '') !== fixedWinnerAnnouncementDate ||
      Number(existing.max_attempts ?? 1) !== 1 ||
      Boolean(existing.active) !== true;

    if (needsDateFix) {
      const { error: updateError } = await supabaseAdmin
        .from(WRITTEN_COMPETITIONS_TABLE)
        .update({
          start_date: fixedStartDate,
          closing_date: fixedClosingDate,
          winner_announcement_date: fixedWinnerAnnouncementDate,
          max_attempts: 1,
          active: true,
        })
        .eq('id', competitionId);
      if (updateError) throw updateError;
    }
  }

  const { count: questionCount, error: questionCountError } = await supabaseAdmin
    .from(WRITTEN_QUESTIONS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('competition_id', competitionId);
  if (questionCountError) {
    if (isMissingTableError(questionCountError)) {
      return { tableMissing: true as const, created, competitionId };
    }
    throw questionCountError;
  }

  if (!questionCount) {
    await insertSeedQuestions(competitionId);
  }

  const { count: prizeCount, error: prizeCountError } = await supabaseAdmin
    .from(WRITTEN_PRIZES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('competition_id', competitionId);
  if (prizeCountError) {
    if (isMissingTableError(prizeCountError)) {
      return { tableMissing: true as const, created, competitionId };
    }
    throw prizeCountError;
  }

  if (!prizeCount) {
    const { error } = await supabaseAdmin.from(WRITTEN_PRIZES_TABLE).insert(
      RABI_UL_AWWAL_SEED_PRIZES.map((prize) => ({
        competition_id: competitionId,
        prize_name: prize.prizeName,
        prize_description: prize.prizeDescription,
        prize_image_url: prize.prizeImageUrl,
        sponsor: prize.sponsor,
        sponsor_logo_url: prize.sponsorLogoUrl,
        winners_count: prize.winnersCount,
        prize_order: prize.prizeOrder,
        active: true,
      }))
    );
    if (error) throw error;
  }

  return { tableMissing: false as const, created, competitionId };
}

async function insertSeedQuestions(competitionId: string) {
  const fullRows = RABI_UL_AWWAL_SEED_QUESTIONS.map((question) => ({
    competition_id: competitionId,
    question_number: question.questionNumber,
    question_text: question.questionText,
    difficulty: question.difficulty,
    topic: question.topic,
    expected_answer: question.expectedAnswer,
    marking_guidance: question.markingGuidance,
    max_marks: question.maxMarks,
    min_required_points: question.minRequiredPoints,
    source: question.source,
    explanation: question.explanation,
    active: true,
  }));
  const { error } = await supabaseAdmin.from(WRITTEN_QUESTIONS_TABLE).insert(fullRows);
  if (!error) return;

  const missingColumn =
    error.code === 'PGRST204' || /schema cache|could not find the .* column/i.test(String(error.message || ''));
  if (!missingColumn) throw error;

  const minimalRows = RABI_UL_AWWAL_SEED_QUESTIONS.map((question) => ({
    competition_id: competitionId,
    question_number: question.questionNumber,
    question_text: question.questionText,
    difficulty: question.difficulty,
    topic: question.topic,
    expected_answer: question.expectedAnswer,
    marking_guidance: question.markingGuidance,
    max_marks: question.maxMarks,
    active: true,
  }));
  const retry = await supabaseAdmin.from(WRITTEN_QUESTIONS_TABLE).insert(minimalRows);
  if (retry.error) throw retry.error;
}

export function nextPrizeForWinner(
  prizes: WrittenPrize[],
  winners: Array<{ prizeId: string | null; status: WrittenWinnerStatus }>
) {
  const active = prizes.filter((prize) => prize.active).sort((a, b) => a.prizeOrder - b.prizeOrder);
  for (const prize of active) {
    const taken = winners.filter(
      (winner) => winner.prizeId === prize.id && winner.status !== 'disqualified'
    ).length;
    if (taken < prize.winnersCount) return prize;
  }
  return active[0] ?? null;
}

export { publicDisplayName };
