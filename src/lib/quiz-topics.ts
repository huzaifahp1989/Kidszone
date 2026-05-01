export type QuizTopicId = 'quran' | 'hajj' | 'salah' | 'hadith' | 'seerah' | 'sahabah'

export interface QuizTopic {
  id: QuizTopicId
  label: string
  emoji: string
  // Category aliases used by DB and static fallback questions
  categories: string[]
}

export const QUIZ_TOPICS: QuizTopic[] = [
  { id: 'quran', label: 'Quran', emoji: '📖', categories: ['quran'] },
  { id: 'hajj', label: 'Hajj', emoji: '🕋', categories: ['hajj'] },
  { id: 'salah', label: 'Salah', emoji: '🕌', categories: ['salah'] },
  { id: 'hadith', label: 'Hadith', emoji: '📚', categories: ['hadith'] },
  { id: 'seerah', label: 'Seerah', emoji: '🌙', categories: ['seerah'] },
  { id: 'sahabah', label: 'Sahabah', emoji: '⭐', categories: ['sahabah'] },
]

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededRng(seed: number) {
  let state = seed || 1
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  const rand = seededRng(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function normalize(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase()
}

export function getTopicById(topicId: string | null | undefined): QuizTopic | undefined {
  const normalizedId = normalize(topicId)
  return QUIZ_TOPICS.find((topic) => topic.id === normalizedId)
}

export function filterQuestionsByTopic<T extends { category?: string | null }>(
  questions: T[],
  topicId: string | null | undefined
): T[] {
  const topic = getTopicById(topicId)
  if (!topic) return questions

  const allowed = new Set(topic.categories.map((category) => normalize(category)))
  return questions.filter((question) => allowed.has(normalize(question.category)))
}

export function getTopicQuestionCount<T extends { category?: string | null }>(
  questions: T[],
  topicId: string
): number {
  return filterQuestionsByTopic(questions, topicId).length
}

export function getTopicQuizQuestions<T extends { category?: string | null; id: string }>(
  questions: T[],
  topicId: string,
  dateSeed: string,
  count: number = 5
): T[] {
  const filtered = filterQuestionsByTopic(questions, topicId)
  if (filtered.length <= count) {
    return filtered
  }

  return seededShuffle(filtered, hashString(`${dateSeed}:${topicId}`)).slice(0, count)
}

export function getWeeklyTopicSeed(input?: Date | string): string {
  const d = input ? new Date(input) : new Date()
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d

  const day = safeDate.getUTCDay() // 0 = Sun, 1 = Mon
  const daysSinceMonday = (day + 6) % 7

  const mondayUtc = new Date(Date.UTC(
    safeDate.getUTCFullYear(),
    safeDate.getUTCMonth(),
    safeDate.getUTCDate()
  ))
  mondayUtc.setUTCDate(mondayUtc.getUTCDate() - daysSinceMonday)

  return mondayUtc.toISOString().slice(0, 10)
}
