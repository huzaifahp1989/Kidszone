export const WRITTEN_COMPETITION_CATEGORIES = [
  'seerah',
  'quran',
  'hadith',
  'islamic-history',
  'ramadan',
  'muharram',
  'children',
  'general',
] as const;

export type WrittenCompetitionCategory = (typeof WRITTEN_COMPETITION_CATEGORIES)[number];

export const WRITTEN_QUESTION_DIFFICULTIES = ['medium', 'challenging', 'advanced'] as const;
export type WrittenQuestionDifficulty = (typeof WRITTEN_QUESTION_DIFFICULTIES)[number];

export const WRITTEN_SUBMISSION_STATUSES = [
  'pending_review',
  'under_review',
  'reviewed',
  'approved',
  'rejected',
  'eligible',
  'winner',
] as const;
export type WrittenSubmissionStatus = (typeof WRITTEN_SUBMISSION_STATUSES)[number];

export const WRITTEN_WINNER_STATUSES = ['awaiting_verification', 'confirmed', 'disqualified'] as const;
export type WrittenWinnerStatus = (typeof WRITTEN_WINNER_STATUSES)[number];

export const DEFAULT_WRITTEN_SLUG = 'rabi-ul-awwal-seerah-2026';
export const DEFAULT_MAX_ANSWER_LENGTH = 2000;
export const DEFAULT_QUESTION_COUNT = 10;
export const DEFAULT_MAX_MARKS_PER_QUESTION = 10;

export const SUBMISSION_STATUS_LABELS: Record<WrittenSubmissionStatus, string> = {
  pending_review: 'Pending Review',
  under_review: 'Under Review',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
  eligible: 'Eligible',
  winner: 'Winner',
};

export const WINNER_STATUS_LABELS: Record<WrittenWinnerStatus, string> = {
  awaiting_verification: 'Awaiting Admin Verification',
  confirmed: 'Confirmed Winner',
  disqualified: 'Disqualified',
};

export type WrittenCompetition = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: WrittenCompetitionCategory;
  rules: string;
  prizeInformation: string;
  startDate: string | null;
  closingDate: string | null;
  winnerAnnouncementDate: string | null;
  questionCount: number;
  maxAnswerLength: number;
  minAge: number | null;
  maxAttempts: number;
  minScoreRequired: number;
  winnersCount: number;
  showWinnersPublicly: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WrittenQuestionPublic = {
  id: string;
  questionNumber: number;
  questionText: string;
  difficulty: WrittenQuestionDifficulty;
  topic: string;
  maxMarks: number;
  active: boolean;
};

export type WrittenQuestionAdmin = WrittenQuestionPublic & {
  expectedAnswer: string;
  markingGuidance: string;
  minRequiredPoints: number;
  source: string;
  explanation: string;
};

export type WrittenPrize = {
  id: string;
  competitionId: string;
  prizeName: string;
  prizeDescription: string;
  prizeImageUrl: string | null;
  prizeImagePath: string | null;
  sponsor: string;
  sponsorLogoUrl: string | null;
  winnersCount: number;
  prizeOrder: number;
  active: boolean;
};

export type WrittenAnswerPublic = {
  id: string;
  questionId: string;
  questionNumber: number;
  questionText: string;
  answerText: string;
  maxMarks: number;
  marksAwarded: number | null;
  adminFeedback: string;
};

export type WrittenAnswerAdmin = WrittenAnswerPublic & {
  expectedAnswer: string;
  markingGuidance: string;
  source: string;
};

export type WrittenSubmissionSummary = {
  id: string;
  competitionId: string;
  userId: string;
  userName: string;
  email: string;
  city: string;
  age: number | null;
  contactNumber: string;
  status: WrittenSubmissionStatus;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  submittedAt: string;
};

export type WrittenWinnerPublic = {
  id: string;
  displayName: string;
  prizeName: string | null;
  confirmedAt: string | null;
};

export function toPublicQuestion(question: WrittenQuestionAdmin): WrittenQuestionPublic {
  return {
    id: question.id,
    questionNumber: question.questionNumber,
    questionText: question.questionText,
    difficulty: question.difficulty,
    topic: question.topic,
    maxMarks: question.maxMarks,
    active: question.active,
  };
}

export function slugifyCompetitionName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function publicDisplayName(fullName: string) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'Winner';
  const first = parts[0];
  if (parts.length === 1) return first;
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

export function calculatePercentage(totalMarks: number, maxMarks: number) {
  if (!maxMarks || maxMarks <= 0) return 0;
  return Math.round((Math.max(0, totalMarks) / maxMarks) * 100);
}

export function isWrittenCompetitionOpen(competition: Pick<WrittenCompetition, 'active' | 'startDate' | 'closingDate'>, now = new Date()) {
  if (!competition.active) return false;
  const t = now.getTime();
  if (competition.startDate) {
    const start = new Date(competition.startDate).getTime();
    if (!Number.isNaN(start) && t < start) return false;
  }
  if (competition.closingDate) {
    const close = new Date(competition.closingDate).getTime();
    if (!Number.isNaN(close) && t > close) return false;
  }
  return true;
}

export function hasWrittenCompetitionClosed(competition: Pick<WrittenCompetition, 'closingDate'>, now = new Date()) {
  if (!competition.closingDate) return false;
  const close = new Date(competition.closingDate).getTime();
  return !Number.isNaN(close) && now.getTime() > close;
}

export function unknownErrorMessage(error: unknown, fallback = 'Unexpected error') {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) return message;
  }
  return fallback;
}

export function answerTextForQuestion(
  answers: Record<string, unknown> | undefined,
  question: { id: string; questionNumber: number }
) {
  if (!answers) return '';
  const byId = String(answers[question.id] ?? '').trim();
  if (byId) return byId;
  const byNumber = String(answers[String(question.questionNumber)] ?? '').trim();
  if (byNumber) return byNumber;
  return String(answers[`preview-q-${question.questionNumber}`] ?? '').trim();
}

export function isWrittenSubmissionStatus(value: string): value is WrittenSubmissionStatus {
  return (WRITTEN_SUBMISSION_STATUSES as readonly string[]).includes(value);
}

export function categoryLabel(category: string) {
  switch (category) {
    case 'seerah':
      return 'Seerah';
    case 'quran':
      return 'Qur’an';
    case 'hadith':
      return 'Hadith';
    case 'islamic-history':
      return 'Islamic History';
    case 'ramadan':
      return 'Ramadan';
    case 'muharram':
      return 'Muharram';
    case 'children':
      return 'Children’s Islamic Competition';
    default:
      return 'General Islamic Knowledge';
  }
}
