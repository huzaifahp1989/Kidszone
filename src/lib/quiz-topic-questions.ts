import { difficultyModeFromAge } from '@/lib/quiz-difficulty'
import { getQuizQuestionPool } from '@/lib/quiz-question-pool'
import { getAgeSpecificQuizPool, getAllAgeSpecificQuizPools } from '@/lib/age-quiz-pool'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  buildTopicQuizId,
  filterQuestionsByTopic,
  getDailyTopicSeed,
  getTopicQuizQuestions,
  type QuizTopicId,
} from '@/lib/quiz-topics'
import { getTopicQuestionExclusions } from '@/lib/quiz-user-history'

const QUESTIONS_PER_TOPIC_QUIZ = 5

type QuizQuestion = ReturnType<typeof getQuizQuestionPool>[number]

function normalizeQuestion(question: QuizQuestion) {
  const extended = question as QuizQuestion & {
    story?: string
    explanation?: string
    reference?: string
    surah?: string
    didYouKnow?: string
    quranCategory?: string
  }

  return {
    id: String(question.id),
    category: question.category,
    quranCategory: extended.quranCategory,
    question_text: question.question,
    question: question.question,
    options: question.options,
    difficulty: question.difficulty,
    story: extended.story,
    explanation: extended.explanation,
    reference: extended.reference,
    surah: extended.surah,
    didYouKnow: extended.didYouKnow,
    correctAnswer: question.correctAnswer,
  }
}

function buildAgePreferredPool(age: number | undefined | null): QuizQuestion[] {
  const main = getQuizQuestionPool().filter((question) => question && question.id)
  const agePool = getAgeSpecificQuizPool(age) as QuizQuestion[]
  const seen = new Set<string>()
  const merged: QuizQuestion[] = []

  // Prefer age-banded questions first so topic selection draws from them.
  for (const q of [...agePool, ...main]) {
    const id = String(q.id)
    if (seen.has(id)) continue
    seen.add(id)
    merged.push(q)
  }
  return merged
}

export async function resolveTopicQuizQuestions(
  topicId: QuizTopicId,
  userId: string,
  daySeed: string = getDailyTopicSeed()
) {
  const exclusions = await getTopicQuestionExclusions(userId, topicId)

  let age: number | undefined
  let difficultyMode = difficultyModeFromAge(undefined)
  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('age')
      .eq('uid', userId)
      .maybeSingle()
    age = userRow?.age != null ? Number(userRow.age) : undefined
    difficultyMode = difficultyModeFromAge(age)
  } catch {
    /* use default older mix */
  }

  const pool = buildAgePreferredPool(age)
  const ageOnly = getAgeSpecificQuizPool(age) as QuizQuestion[]

  // Prefer age-banded questions for this topic; fill from the full pool if needed.
  let selected = getTopicQuizQuestions(ageOnly, topicId, daySeed, QUESTIONS_PER_TOPIC_QUIZ, {
    userId,
    excludeTodayIds: exclusions.today,
    excludeRecentIds: exclusions.recent,
    attemptIndex: exclusions.attemptsToday,
    difficultyMode,
  })

  if (selected.length < QUESTIONS_PER_TOPIC_QUIZ) {
    const already = new Set(selected.map((q) => String(q.id)))
    const filler = getTopicQuizQuestions(pool, topicId, daySeed, QUESTIONS_PER_TOPIC_QUIZ, {
      userId,
      excludeTodayIds: [...exclusions.today, ...already],
      excludeRecentIds: exclusions.recent,
      attemptIndex: exclusions.attemptsToday,
      difficultyMode,
    })
    for (const q of filler) {
      if (selected.length >= QUESTIONS_PER_TOPIC_QUIZ) break
      if (already.has(String(q.id))) continue
      selected.push(q)
      already.add(String(q.id))
    }
  }

  return {
    daySeed,
    weekSeed: daySeed,
    quizId: buildTopicQuizId(topicId, daySeed, userId),
    questions: selected.map(normalizeQuestion),
    questionIds: selected.map((question) => String(question.id)),
  }
}

/** Trust the client's submitted question set when every id belongs to the topic pool. */
export function resolveSubmittedTopicQuestions(
  topicId: string,
  submittedQuestionIds: string[]
): ReturnType<typeof getQuizQuestionPool> {
  const ids = submittedQuestionIds.map((id) => String(id)).filter(Boolean)
  if (ids.length !== QUESTIONS_PER_TOPIC_QUIZ) return []

  // Include all age pools so submitted age-specific ids validate.
  const agePool = getAllAgeSpecificQuizPools() as QuizQuestion[]
  const main = getQuizQuestionPool().filter((question) => question && question.id)
  const seen = new Set<string>()
  const pool: QuizQuestion[] = []
  for (const q of [...agePool, ...main]) {
    const id = String(q.id)
    if (seen.has(id)) continue
    seen.add(id)
    pool.push(q)
  }
  const topicPool = filterQuestionsByTopic(pool, topicId)
  const byId = new Map(topicPool.map((question) => [String(question.id), question]))

  const resolved = ids
    .map((id) => byId.get(id))
    .filter((question): question is (typeof pool)[number] => Boolean(question))

  return resolved.length === QUESTIONS_PER_TOPIC_QUIZ ? resolved : []
}

export function resolveTopicQuizQuestionsFromIds(
  topicId: string,
  daySeed: string,
  userId: string,
  submittedQuestionIds: string[],
  excludeQuestionIds: string[] = [],
  attemptIndex = 0
) {
  const pool = buildAgePreferredPool(undefined)
  const expected = getTopicQuizQuestions(
    pool.filter((question) => question && question.id),
    topicId,
    daySeed,
    QUESTIONS_PER_TOPIC_QUIZ,
    {
      userId,
      excludeTodayIds: excludeQuestionIds,
      excludeRecentIds: excludeQuestionIds,
      attemptIndex,
    }
  )

  const submittedSet = new Set(submittedQuestionIds.map((id) => String(id)))
  const expectedIds = expected
    .map((question) => String(question.id))
    .sort()
    .join(',')
  const submittedSorted = [...submittedSet].sort().join(',')

  if (expectedIds === submittedSorted) {
    return expected
  }

  const allowedIds = new Set(expected.map((question) => String(question.id)))
  const validSubmitted = submittedQuestionIds
    .map((id) => String(id))
    .filter((id) => allowedIds.has(id))

  if (validSubmitted.length === QUESTIONS_PER_TOPIC_QUIZ) {
    const byId = new Map(expected.map((question) => [String(question.id), question]))
    return validSubmitted
      .map((id) => byId.get(id))
      .filter((question): question is QuizQuestion => Boolean(question))
  }

  return expected
}
