import { quizzes } from '@/data/quizzes'
import { quranQuizQuestions } from '@/data/quran-quiz'
import { akhlaqQuizQuestions } from '@/data/topic-quizzes/akhlaq'
import { duasQuizQuestions } from '@/data/topic-quizzes/duas'
import { hadithQuizQuestions } from '@/data/topic-quizzes/hadith'
import { prophetStoryQuizQuestions } from '@/data/topic-quizzes/prophet-stories'
import { sahabahQuizQuestions } from '@/data/topic-quizzes/sahabah'
import { salahQuizQuestions } from '@/data/topic-quizzes/salah'
import { seerahQuizQuestions } from '@/data/topic-quizzes/seerah'

function normalizeCategory(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase()
}

/** All quiz questions, with the larger topic banks preferred over legacy fallbacks. */
export function getQuizQuestionPool() {
  const expandedCategories = new Set(['akhlaq', 'hadith', 'sahabah', 'salah', 'seerah'])
  const legacyFallbacks = quizzes.filter((question) => {
    const category = normalizeCategory(question.category)
    return category !== 'quran' && !expandedCategories.has(category)
  })

  return [
    ...legacyFallbacks,
    ...quranQuizQuestions,
    ...akhlaqQuizQuestions,
    ...duasQuizQuestions,
    ...hadithQuizQuestions,
    ...sahabahQuizQuestions,
    ...salahQuizQuestions,
    ...seerahQuizQuestions,
    ...prophetStoryQuizQuestions,
  ]
}

export type QuizPoolQuestion = ReturnType<typeof getQuizQuestionPool>[number]
