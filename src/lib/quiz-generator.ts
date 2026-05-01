import { supabaseAdmin } from '@/lib/supabase-admin';
import { quizzes } from '@/data/quizzes';

const REQUESTED_TOPICS = ['Seerah', 'Hadith', 'Quran', 'Prophets', 'Sahabah', 'Hajj'] as const;

const DB_CATEGORY_GROUPS: Record<(typeof REQUESTED_TOPICS)[number], string[]> = {
  Seerah: ['Seerah'],
  Hadith: ['Hadith', 'Sunnah'],
  Quran: ['Quran'],
  Prophets: ['Prophets', 'Seerah'],
  Sahabah: ['Sahabah', 'Seerah'],
  Hajj: ['Hajj'],
};

const STATIC_TOPIC_GROUPS: Record<(typeof REQUESTED_TOPICS)[number], string[]> = {
  Seerah: ['Seerah'],
  Hadith: ['Hadith', 'Sunnah'],
  Quran: ['Quran'],
  Prophets: ['Prophets'],
  Sahabah: ['Sahabah'],
  Hajj: ['Hajj'],
};

const STATIC_DAILY_QUIZ_SIZE = 6;
const DB_DAILY_QUIZ_SIZE = 10;

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

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  const rand = seededRng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function isValidQuizQuestion(q: any): boolean {
  return !!q && Array.isArray(q.options) && Number.isInteger(q.correctAnswer) && q.correctAnswer >= 0 && q.correctAnswer < q.options.length;
}

function pickBalancedDailyQuestions(date: string) {
  const validQuestions = quizzes.filter(isValidQuizQuestion);
  const byCategory = new Map<string, any[]>();

  for (const q of validQuestions) {
    const cat = q.category || 'General';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(q);
  }

  const selected: any[] = [];
  const selectedIds = new Set<string>();

  for (const topic of REQUESTED_TOPICS) {
    if (selected.length >= STATIC_DAILY_QUIZ_SIZE) break;

    const pools = STATIC_TOPIC_GROUPS[topic]
      .flatMap((cat) => byCategory.get(cat) || []);
    if (!pools.length) continue;

    const pool = seededShuffle(pools, hashString(`${date}:${topic}`));
    const candidate = pool.find((q: any) => !selectedIds.has(q.id));
    if (candidate) {
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }
  }

  const categories = seededShuffle(Array.from(byCategory.keys()), hashString(`${date}:categories`));
  for (const category of categories) {
    if (selected.length >= STATIC_DAILY_QUIZ_SIZE) break;
    const pool = seededShuffle(byCategory.get(category) || [], hashString(`${date}:${category}`));
    const candidate = pool.find((q: any) => !selectedIds.has(q.id));
    if (candidate) {
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }
  }

  if (selected.length < STATIC_DAILY_QUIZ_SIZE) {
    const pool = seededShuffle(validQuestions, hashString(`${date}:all`));
    for (const q of pool) {
      if (selected.length >= STATIC_DAILY_QUIZ_SIZE) break;
      if (selectedIds.has(q.id)) continue;
      selected.push(q);
      selectedIds.add(q.id);
    }
  }

  return selected;
}

export async function generateDailyQuiz(date: string) {
  try {
    // 1. Check if quiz exists for today (double check to avoid race conditions)
    const { data: existing } = await supabaseAdmin
      .from('daily_quizzes')
      .select('id, question_ids')
      .eq('quiz_date', date)
      .single();

    if (existing) {
      return { success: true, message: 'Daily quiz already exists', id: existing.id, quiz: existing };
    }

    // 2. Select Questions by requested topics first, then fill to target size
    const selectedQuestionIds: string[] = [];
    const selectedIdSet = new Set<string>();

    for (const topic of REQUESTED_TOPICS) {
      const dbCategories = DB_CATEGORY_GROUPS[topic];
      const { data: candidates, error } = await supabaseAdmin
        .from('questions')
        .select('id, question_text, options')
        .in('category', dbCategories)
        .order('last_used_at', { ascending: true, nullsFirst: true })
        .limit(20);

      if (error) {
        console.error(`Error fetching for topic ${topic}:`, error);
        continue;
      }

      if (!candidates || candidates.length === 0) {
        console.warn(`No questions found for topic ${topic}`);
        continue;
      }

      const shuffled = seededShuffle(candidates, hashString(`${date}:${topic}:db`));
      const picked = shuffled.find((q) => !selectedIdSet.has(String(q.id)));
      if (picked) {
        selectedQuestionIds.push(String(picked.id));
        selectedIdSet.add(String(picked.id));
      }
    }

    if (selectedQuestionIds.length < DB_DAILY_QUIZ_SIZE) {
      const needed = DB_DAILY_QUIZ_SIZE - selectedQuestionIds.length;
      const { data: extra } = await supabaseAdmin
        .from('questions')
        .select('id')
        .order('last_used_at', { ascending: true, nullsFirst: true })
        .limit(200);

      if (extra) {
        for (const row of seededShuffle(extra, hashString(`${date}:fill-db`))) {
          const id = String(row.id);
          if (selectedIdSet.has(id)) continue;
          selectedQuestionIds.push(id);
          selectedIdSet.add(id);
          if (selectedQuestionIds.length >= DB_DAILY_QUIZ_SIZE || selectedQuestionIds.length >= needed + REQUESTED_TOPICS.length) {
            break;
          }
        }
      }
    }
    
    // Ensure we have exactly 10 or at least some
    if (selectedQuestionIds.length === 0) {
      throw new Error('No questions available to create quiz');
    }

    // 3. Insert Daily Quiz
    const { data: newQuiz, error: insertError } = await supabaseAdmin
      .from('daily_quizzes')
      .insert({
        quiz_date: date,
        question_ids: selectedQuestionIds, // Store as JSON array
        is_published: true
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation if created in parallel
      if (insertError.code === '23505') { // unique_violation
         const { data: existingRetry } = await supabaseAdmin
            .from('daily_quizzes')
            .select('id, question_ids')
            .eq('quiz_date', date)
            .single();
         return { success: true, message: 'Daily quiz created (race condition handled)', id: existingRetry?.id, quiz: existingRetry };
      }
      throw insertError;
    }

    // 4. Update usage stats (fire and forget)
    await supabaseAdmin
      .from('questions')
      .update({ last_used_at: new Date().toISOString() })
      .in('id', selectedQuestionIds);

    return { success: true, message: 'Daily quiz created', quiz: newQuiz };

  } catch (err: any) {
    console.error('Quiz generation error:', err);
    throw err;
  }
}

// Fallback for offline/static mode
export function getStaticQuiz(date: string) {
  const selected = pickBalancedDailyQuestions(date);
  
  return {
    quizId: `fallback-${date}`,
    date: date,
    questions: selected
  };
}
