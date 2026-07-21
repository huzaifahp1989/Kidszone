import { supabaseAdmin } from '@/lib/supabase-admin'
import { getDailyTopicSeed } from '@/lib/quiz-topics'

export type TopicQuestionExclusions = {
  /** Question ids already used in today's attempts for this topic */
  today: string[]
  /** Question ids used in the last 7 days */
  recent: string[]
  /** How many quizzes the user finished today for this topic */
  attemptsToday: number
}

function getUtcDayStartIso(dateKey: string): string {
  return `${dateKey}T00:00:00.000Z`
}

export async function getTopicQuestionExclusions(
  userId: string,
  topicId: string,
  recentDays = 7
): Promise<TopicQuestionExclusions> {
  const todayKey = getDailyTopicSeed()
  const todayStartMs = new Date(getUtcDayStartIso(todayKey)).getTime()

  const recentStart = new Date(todayStartMs)
  recentStart.setUTCDate(recentStart.getUTCDate() - recentDays)

  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select('question_ids, completed_at')
    .eq('user_id', userId)
    .eq('topic', topicId)
    .gte('completed_at', recentStart.toISOString())

  if (error) {
    console.error('Failed to load quiz question history:', error)
    return { today: [], recent: [], attemptsToday: 0 }
  }

  const today = new Set<string>()
  const recent = new Set<string>()
  let attemptsToday = 0

  for (const row of data || []) {
    const completedMs = new Date(String(row.completed_at || '')).getTime()
    const isToday = Number.isFinite(completedMs) && completedMs >= todayStartMs
    if (isToday) attemptsToday += 1

    if (!Array.isArray(row.question_ids)) continue
    for (const id of row.question_ids) {
      const qid = String(id)
      if (isToday) today.add(qid)
      recent.add(qid)
    }
  }

  return {
    today: [...today],
    recent: [...recent],
    attemptsToday,
  }
}

/** @deprecated Use getTopicQuestionExclusions */
export async function getUserSeenQuestionIdsForTopicThisWeek(
  userId: string,
  topicId: string,
  _weekSeed?: string
): Promise<string[]> {
  const exclusions = await getTopicQuestionExclusions(userId, topicId)
  return [...new Set([...exclusions.today, ...exclusions.recent])]
}
