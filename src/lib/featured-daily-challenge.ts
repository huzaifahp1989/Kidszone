import {
  FEATURED_DAILY_CHALLENGE_CATEGORIES,
  FEATURED_DAILY_CHALLENGE_QUESTION_BANK,
  type FeaturedDailyChallengeCategoryId,
  type FeaturedDailyChallengeDifficulty,
  type FeaturedDailyChallengeQuestion,
} from '@/data/featured-daily-islamic-challenge';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getDailyTopicSeed } from '@/lib/quiz-topics';

export const FEATURED_DAILY_CHALLENGE_TOPIC_ID = 'featured-daily';
export const FEATURED_DAILY_CHALLENGE_QUESTION_COUNT = 10;
export const FEATURED_DAILY_CHALLENGE_MAX_SCORE = 120;

const DIFFICULTY_PLAN: FeaturedDailyChallengeDifficulty[] = [
  'Medium',
  'Medium',
  'Medium',
  'Medium+',
  'Medium+',
  'Medium+',
  'Medium+',
  'Challenging',
  'Challenging',
  'Challenging',
];

type FeaturedChallengeHistory = {
  masteredQuestionIds: string[];
  todayQuestionIds: string[];
  recentQuestionIds: string[];
  attemptsToday: number;
};

export type FeaturedChallengeQuestionView = {
  id: string;
  category: string;
  categoryId: FeaturedDailyChallengeCategoryId;
  question: string;
  question_text: string;
  options: string[];
  correctAnswer: number;
  difficulty: FeaturedDailyChallengeDifficulty;
  explanation: string;
  reference: string;
  didYouKnow: string;
  learningFact: string;
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  const rand = seededRng(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickDeterministicSubset<T>(items: T[], count: number, seedKey: string): T[] {
  return seededShuffle(items, hashString(seedKey)).slice(0, count);
}

function getCategoryLabel(categoryId: FeaturedDailyChallengeCategoryId): string {
  return FEATURED_DAILY_CHALLENGE_CATEGORIES.find((category) => category.id === categoryId)?.label || 'Islamic Knowledge';
}

function getDifficultyPriority(
  preferred: FeaturedDailyChallengeDifficulty
): FeaturedDailyChallengeDifficulty[] {
  if (preferred === 'Challenging') {
    return ['Challenging', 'Medium+', 'Medium'];
  }
  if (preferred === 'Medium+') {
    return ['Medium+', 'Challenging', 'Medium'];
  }
  return ['Medium', 'Medium+', 'Challenging'];
}

function buildQuestionView(
  question: FeaturedDailyChallengeQuestion,
  userId: string,
  daySeed: string,
  slotIndex: number
): FeaturedChallengeQuestionView {
  const distractors = pickDeterministicSubset(
    question.distractors,
    3,
    `${daySeed}:${userId}:${question.id}:distractors:${slotIndex}`
  );
  const options = seededShuffle(
    [...distractors, question.correctAnswer],
    hashString(`${daySeed}:${userId}:${question.id}:options:${slotIndex}`)
  );

  return {
    id: question.id,
    category: getCategoryLabel(question.categoryId),
    categoryId: question.categoryId,
    question: question.question,
    question_text: question.question,
    options,
    correctAnswer: options.findIndex((option) => option === question.correctAnswer),
    difficulty: question.difficulty,
    explanation: question.explanation,
    reference: question.reference,
    didYouKnow: question.learningFact,
    learningFact: question.learningFact,
  };
}

async function getFeaturedChallengeHistory(
  userId: string,
  recentDays = 30
): Promise<FeaturedChallengeHistory> {
  const todayKey = getDailyTopicSeed();
  const todayStart = new Date(`${todayKey}T00:00:00.000Z`);
  const recentStart = new Date(todayStart);
  recentStart.setUTCDate(recentStart.getUTCDate() - recentDays);

  let data: Array<{
    question_ids?: string[] | null;
    correct_question_ids?: string[] | null;
    completed_at?: string | null;
  }> | null = null;

  const primary = await supabaseAdmin
    .from('quiz_attempts')
    .select('question_ids, correct_question_ids, completed_at')
    .eq('user_id', userId)
    .eq('topic', FEATURED_DAILY_CHALLENGE_TOPIC_ID)
    .gte('completed_at', recentStart.toISOString());

  if (primary.error) {
    const fallback = await supabaseAdmin
      .from('quiz_attempts')
      .select('question_ids, completed_at')
      .eq('user_id', userId)
      .eq('topic', FEATURED_DAILY_CHALLENGE_TOPIC_ID)
      .gte('completed_at', recentStart.toISOString());

    if (fallback.error) {
      console.error('Failed to load featured challenge history:', fallback.error);
      return {
        masteredQuestionIds: [],
        todayQuestionIds: [],
        recentQuestionIds: [],
        attemptsToday: 0,
      };
    }

    data = (fallback.data || []) as Array<{
      question_ids?: string[] | null;
      completed_at?: string | null;
    }>;
  } else {
    data = primary.data || [];
  }

  const mastered = new Set<string>();
  const today = new Set<string>();
  const recent = new Set<string>();
  let attemptsToday = 0;

  for (const row of data || []) {
    const completedMs = new Date(String(row.completed_at || '')).getTime();
    const isToday = Number.isFinite(completedMs) && completedMs >= todayStart.getTime();
    if (isToday) attemptsToday += 1;

    if (Array.isArray(row.question_ids)) {
      for (const questionId of row.question_ids) {
        const id = String(questionId);
        recent.add(id);
        if (isToday) today.add(id);
      }
    }

    if (Array.isArray(row.correct_question_ids)) {
      for (const questionId of row.correct_question_ids) {
        mastered.add(String(questionId));
      }
    }
  }

  return {
    masteredQuestionIds: [...mastered],
    todayQuestionIds: [...today],
    recentQuestionIds: [...recent],
    attemptsToday,
  };
}

export function buildFeaturedDailyQuizFromHistory(
  userId: string,
  daySeed: string,
  history: FeaturedChallengeHistory
) {
  const mastered = new Set(history.masteredQuestionIds.map(String));
  const today = new Set(history.todayQuestionIds.map(String));
  const recent = new Set(history.recentQuestionIds.map(String));

  const categoryOrder = seededShuffle(
    FEATURED_DAILY_CHALLENGE_CATEGORIES.map((category) => category.id),
    hashString(`${daySeed}:${userId}:featured-categories:${history.attemptsToday}`)
  );

  const selected: FeaturedDailyChallengeQuestion[] = [];
  const selectedCategories = new Set<FeaturedDailyChallengeCategoryId>();

  for (let slotIndex = 0; slotIndex < DIFFICULTY_PLAN.length; slotIndex += 1) {
    const preferredDifficulty = DIFFICULTY_PLAN[slotIndex];
    let picked: FeaturedDailyChallengeQuestion | null = null;

    for (const categoryId of categoryOrder) {
      if (selectedCategories.has(categoryId)) continue;

      const categoryQuestions = FEATURED_DAILY_CHALLENGE_QUESTION_BANK.filter(
        (question) => question.categoryId === categoryId && !mastered.has(question.id)
      );
      if (!categoryQuestions.length) continue;

      const exactPool = categoryQuestions.filter(
        (question) =>
          !today.has(question.id) &&
          !recent.has(question.id) &&
          question.difficulty === preferredDifficulty
      );
      const relaxedRecentPool = categoryQuestions.filter(
        (question) => !today.has(question.id) && question.difficulty === preferredDifficulty
      );
      const anyDifficultyPool = categoryQuestions.filter((question) => !today.has(question.id));

      const rankedPools = [
        exactPool,
        relaxedRecentPool,
        anyDifficultyPool.filter((question) =>
          getDifficultyPriority(preferredDifficulty).includes(question.difficulty)
        ),
        anyDifficultyPool,
      ];

      for (const pool of rankedPools) {
        if (!pool.length) continue;
        const chosen = seededShuffle(
          pool,
          hashString(`${daySeed}:${userId}:${categoryId}:${preferredDifficulty}:${slotIndex}`)
        )[0];
        if (chosen) {
          picked = chosen;
          break;
        }
      }

      if (picked) break;
    }

    if (!picked) {
      break;
    }

    selected.push(picked);
    selectedCategories.add(picked.categoryId);
  }

  const questions = selected.map((question, slotIndex) =>
    buildQuestionView(question, userId, daySeed, slotIndex)
  );

  return {
    daySeed,
    quizId: buildFeaturedDailyQuizId(daySeed, userId),
    questions,
    questionIds: questions.map((question) => question.id),
    categoriesUsed: questions.map((question) => question.category),
    attemptsToday: history.attemptsToday,
  };
}

export async function resolveFeaturedDailyChallenge(
  userId: string,
  daySeed: string = getDailyTopicSeed()
) {
  const history = await getFeaturedChallengeHistory(userId);
  return buildFeaturedDailyQuizFromHistory(userId, daySeed, history);
}

export function resolveFeaturedSubmittedQuestions(
  userId: string,
  daySeed: string,
  questionIds: string[]
): FeaturedChallengeQuestionView[] {
  const questionById = new Map(
    FEATURED_DAILY_CHALLENGE_QUESTION_BANK.map((question) => [question.id, question] as const)
  );

  return questionIds
    .map((questionId, slotIndex) => {
      const question = questionById.get(String(questionId));
      if (!question) return null;
      return buildQuestionView(question, userId, daySeed, slotIndex);
    })
    .filter((question): question is FeaturedChallengeQuestionView => Boolean(question));
}

export function buildFeaturedDailyQuizId(daySeed: string, userId: string): string {
  return `featured-${daySeed}-${userId}`;
}

export function parseFeaturedDailyQuizId(
  quizId: string
): { daySeed: string; userId?: string } | null {
  if (!quizId.startsWith('featured-')) return null;
  const match = quizId.slice('featured-'.length).match(/^(\d{4}-\d{2}-\d{2})(?:-(.+))?$/);
  if (!match) return null;
  return {
    daySeed: match[1],
    userId: match[2] || undefined,
  };
}
