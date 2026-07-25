import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Map each quiz session to a unique synthetic DATE key (2096+) so we never
 * collide with legacy shared daily_quizzes rows or UNIQUE(user_id, quiz_id).
 *
 * Uses time + random entropy so concurrent submits almost never collide on
 * UNIQUE(quiz_date) — the previous hash space was only ~1.3k dates and caused
 * recursive insert retries that slowed quiz finish.
 */
export function getSessionQuizStorageDate(sessionKey: string): string {
  const now = Date.now()
  const mix = (now ^ (sessionKey.length * 2654435761)) >>> 0
  const year = 2096 + (mix % 7900)
  const month = (mix % 12) + 1
  const day = ((mix >>> 8) % 28) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function nextStorageDate(attempt: number): string {
  const n = (Date.now() + attempt * 9973 + Math.floor(Math.random() * 1_000_000)) >>> 0
  const year = 2096 + (n % 7900)
  const month = (n % 12) + 1
  const day = ((n >>> 7) % 28) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** One daily_quizzes row per quiz attempt — allows 2+ quizzes/day per user. */
export async function createSessionQuizRecordId(
  topicId: string,
  questionIds: string[],
  sessionKey: string = randomUUID()
): Promise<string> {
  const taggedQuestionIds = [`topic:${topicId}`, `session:${sessionKey}`, ...questionIds.map(String)]

  for (let attempt = 0; attempt < 6; attempt++) {
    const storageDate = attempt === 0 ? getSessionQuizStorageDate(sessionKey) : nextStorageDate(attempt)

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

    if (insertErr?.code === '23505') {
      continue
    }

    throw new Error(insertErr?.message || 'Could not create quiz session record')
  }

  throw new Error('Could not create quiz session record after retries')
}

const SESSION_RECORD_TIMEOUT_MS = 8_000

/** Same as createSessionQuizRecordId but aborts after a few seconds so submit cannot hang. */
export async function createSessionQuizRecordIdWithTimeout(
  topicId: string,
  questionIds: string[],
  sessionKey?: string
): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      createSessionQuizRecordId(topicId, questionIds, sessionKey),
      new Promise<string>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Quiz session record timed out')),
          SESSION_RECORD_TIMEOUT_MS
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
