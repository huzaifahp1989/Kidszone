import { applyDifficultyMode, type QuizDifficultyMode } from '@/lib/quiz-difficulty'

export type QuizTopicId =
  | 'quran'
  | 'salah'
  | 'hadith'
  | 'seerah'
  | 'sahabah'
  | 'akhlaq'
  | 'story-khidr-musa'
  | 'story-sulaiman'
  | 'story-yusuf'
  | 'story-ibrahim'
  | 'story-nuh'
  | 'story-yunus'
  | 'story-maryam'

export interface QuizTopic {
  id: QuizTopicId
  label: string
  emoji: string
  // Category aliases used by DB and static fallback questions
  categories: string[]
  description?: string
  group?: 'general' | 'quran-stories'
}

export const QUIZ_TOPICS: QuizTopic[] = [
  { id: 'quran', label: 'Quran', emoji: '📖', categories: ['quran'], group: 'general' },
  { id: 'salah', label: 'Salah', emoji: '🕌', categories: ['salah'], group: 'general' },
  { id: 'hadith', label: 'Hadith', emoji: '📚', categories: ['hadith'], group: 'general' },
  { id: 'seerah', label: 'Seerah', emoji: '🌙', categories: ['seerah'], group: 'general' },
  { id: 'sahabah', label: 'Sahabah', emoji: '⭐', categories: ['sahabah'], group: 'general' },
  { id: 'akhlaq', label: 'Akhlaq', emoji: '🤝', categories: ['akhlaq'], group: 'general' },
  {
    id: 'story-khidr-musa',
    label: 'Khidr & Musa (AS)',
    emoji: '🌊',
    categories: ['story-khidr-musa'],
    group: 'quran-stories',
    description: 'Surah Al-Kahf — the journey of hidden wisdom',
  },
  {
    id: 'story-sulaiman',
    label: 'Sulaiman (AS)',
    emoji: '👑',
    categories: ['story-sulaiman'],
    group: 'quran-stories',
    description: 'Kingdom, birds, jinn, and the Queen of Sheba',
  },
  {
    id: 'story-yusuf',
    label: 'Yusuf (AS)',
    emoji: '🌟',
    categories: ['story-yusuf'],
    group: 'quran-stories',
    description: 'The best of stories — patience, forgiveness, and trust',
  },
  {
    id: 'story-ibrahim',
    label: 'Ibrahim (AS)',
    emoji: '🔥',
    categories: ['story-ibrahim'],
    group: 'quran-stories',
    description: 'Tawhid, the fire, sacrifice, and building the Ka\'bah',
  },
  {
    id: 'story-nuh',
    label: 'Nuh (AS)',
    emoji: '🚢',
    categories: ['story-nuh'],
    group: 'quran-stories',
    description: 'The great flood, the ark, and steadfast da\'wah',
  },
  {
    id: 'story-yunus',
    label: 'Yunus (AS)',
    emoji: '🐋',
    categories: ['story-yunus'],
    group: 'quran-stories',
    description: 'Patience, the whale, and returning to Allah',
  },
  {
    id: 'story-maryam',
    label: 'Maryam (AS)',
    emoji: '🌸',
    categories: ['story-maryam'],
    group: 'quran-stories',
    description: 'Purity, trust in Allah, and the birth of Isa (AS)',
  },
]

export const QUIZ_TOPIC_GROUPS = [
  { id: 'general' as const, title: 'Islamic Topics' },
  { id: 'quran-stories' as const, title: 'Quranic Prophet Stories' },
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

export interface TopicQuizSelectionOptions {
  userId?: string
  /** @deprecated use excludeTodayIds / excludeRecentIds */
  excludeQuestionIds?: string[]
  excludeTodayIds?: string[]
  excludeRecentIds?: string[]
  /** 0-based count of today's attempts on this topic — varies shuffle for quiz 2 */
  attemptIndex?: number
  difficultyMode?: QuizDifficultyMode
}

export function getTopicQuizQuestions<T extends { category?: string | null; id: string; difficulty?: string | null }>(
  questions: T[],
  topicId: string,
  dateSeed: string,
  count: number = 5,
  options?: TopicQuizSelectionOptions
): T[] {
  const filtered = filterQuestionsByTopic(questions, topicId)
  if (!filtered.length) return []

  const excludeToday = new Set([
    ...(options?.excludeTodayIds || []),
    ...(options?.excludeQuestionIds || []),
  ].map(String))
  const excludeRecent = new Set((options?.excludeRecentIds || []).map(String))

  // Prefer questions not used today or in the last week; relax if the pool is too small.
  let pool = filtered.filter(
    (question) =>
      !excludeToday.has(String(question.id)) && !excludeRecent.has(String(question.id))
  )
  if (pool.length < count) {
    pool = filtered.filter((question) => !excludeToday.has(String(question.id)))
  }
  if (pool.length < count) {
    pool = [...filtered]
  }

  const userPart = options?.userId ? `:${options.userId}` : ''
  const attemptPart =
    options?.attemptIndex != null ? `:attempt${options.attemptIndex}` : ''
  const seed = hashString(`${dateSeed}:${topicId}${userPart}${attemptPart}`)
  const shuffled = seededShuffle(pool, seed)
  const mode = options?.difficultyMode ?? 'older'
  return applyDifficultyMode(shuffled, mode, Math.min(count, shuffled.length))
}

export function buildTopicQuizId(topicId: string, daySeed: string, userId: string): string {
  return `topic-${topicId}-${daySeed}-${userId}`
}

export function parseTopicQuizId(quizId: string): { topicId: string; weekSeed: string; userId?: string } | null {
  if (!quizId.startsWith('topic-')) return null

  const rest = quizId.slice('topic-'.length)
  const topicsByLength = [...QUIZ_TOPICS].sort((a, b) => b.id.length - a.id.length)
  for (const topic of topicsByLength) {
    const prefix = `${topic.id}-`
    if (!rest.startsWith(prefix)) continue

    const afterTopic = rest.slice(prefix.length)
    const match = afterTopic.match(/^(\d{4}-\d{2}-\d{2})(?:-(.+))?$/)
    if (!match) continue

    return {
      topicId: topic.id,
      weekSeed: match[1],
      userId: match[2] || undefined,
    }
  }

  return null
}

export function getDailyTopicSeed(input?: Date | string): string {
  const d = input ? new Date(input) : new Date()
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d

  return new Date(
    Date.UTC(safeDate.getUTCFullYear(), safeDate.getUTCMonth(), safeDate.getUTCDate())
  )
    .toISOString()
    .slice(0, 10)
}

/** @deprecated Quizzes now rotate daily — use getDailyTopicSeed */
export function getWeeklyTopicSeed(input?: Date | string): string {
  return getDailyTopicSeed(input)
}
