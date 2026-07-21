import { quizzes } from '@/data/quizzes'
import { quranQuizQuestions } from '@/data/quran-quiz'
import { prophetStoryQuizQuestions } from '@/data/topic-quizzes/prophet-stories'

function normalizeCategory(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase()
}

/** All quiz questions: non-Quran topics from legacy pool + professional Quran bank + prophet story banks. */
export function getQuizQuestionPool() {
  const nonQuran = quizzes.filter((question) => normalizeCategory(question.category) !== 'quran')
  return [...nonQuran, ...quranQuizQuestions, ...prophetStoryQuizQuestions]
}

export type QuizPoolQuestion = ReturnType<typeof getQuizQuestionPool>[number]
