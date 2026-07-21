import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Map each quiz session to a unique synthetic DATE key (2096+) so we never
 * collide with legacy shared daily_quizzes rows or UNIQUE(user_id, quiz_id).
 */
export function getSessionQuizStorageDate(sessionKey: string): string {
  const hash = hashString(sessionKey)
  const year = 2096 + (hash % 4)
  const month = (hash % 12) + 1
  const day = (hash % 28) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** One daily_quizzes row per quiz attempt — allows 2+ quizzes/day per user. */
export async function createSessionQuizRecordId(
  topicId: string,
  questionIds: string[],
  sessionKey: string = randomUUID()
): Promise<string> {
  const storageDate = getSessionQuizStorageDate(sessionKey)
  const taggedQuestionIds = [`topic:${topicId}`, `session:${sessionKey}`, ...questionIds.map(String)]

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('daily_quizzes')
    .insert({
      quiz_date: storageDate,
      question_ids: taggedQuestionIds,
      is_published: false,
    })
    .select('id')
    .single()

  if (!insertErr && inserted?.id) {
    return inserted.id
  }

  // Extremely unlikely collision on synthetic date — retry with fresh session key.
  if (insertErr?.code === '23505') {
    return createSessionQuizRecordId(topicId, questionIds, randomUUID())
  }

  throw new Error(insertErr?.message || 'Could not create quiz session record')
}
