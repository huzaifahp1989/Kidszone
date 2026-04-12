import { supabaseAdmin } from '@/lib/supabase-admin';
import { quizzes } from '@/data/quizzes';

// Meta Category Mapping to DB Categories
const CATEGORY_GROUPS = {
  'Quran': ['Quran'],
  'Hadith & Sunnah': ['Hadith', 'Sunnah'],
  'Seerah': ['Seerah'],
  'Ramadan': ['Ramadan'],
  'Akhlaq': ['Akhlaq']
};

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

    // 2. Select Questions
    let selectedQuestionIds: string[] = [];
    
    // We want 2 questions from each of the 5 meta-categories to make 10 total
    const metaCategories = Object.keys(CATEGORY_GROUPS);
    
    for (const metaCat of metaCategories) {
      const dbCategories = CATEGORY_GROUPS[metaCat as keyof typeof CATEGORY_GROUPS];
      
      // Fetch candidate questions
      // We want questions not used recently (or ever)
      const { data: candidates, error } = await supabaseAdmin
        .from('questions')
        .select('id, question_text, options')
        .in('category', dbCategories)
        .order('last_used_at', { ascending: true, nullsFirst: true })
        .limit(10); // Fetch a few to randomize
        
      if (error) {
        console.error(`Error fetching for ${metaCat}:`, error);
        continue;
      }

      if (!candidates || candidates.length === 0) {
        console.warn(`No questions found for ${metaCat}`);
        continue;
      }

      // Shuffle and pick 2
      const shuffled = candidates.sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, 2).map(q => q.id as string);
      selectedQuestionIds.push(...picked);
    }

    // Fallback if we don't have enough questions (e.g. fresh DB)
    if (selectedQuestionIds.length < 10) {
       // Just fill up with random questions from any category
       const needed = 10 - selectedQuestionIds.length;
       const { data: extra } = await supabaseAdmin
         .from('questions')
         .select('id')
         .not('id', 'in', `(${selectedQuestionIds.join(',')})`)
         .limit(needed);
         
       if (extra) {
         selectedQuestionIds.push(...extra.map(q => q.id));
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
  // Simple deterministic shuffle
  // Use date string to create a seed
  const seed = date.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Create a copy to sort
  const shuffled = [...quizzes].sort((a, b) => {
    // Pseudo-random sort based on seed and ID
    const valA = (a.id.charCodeAt(0) * seed) % 100;
    const valB = (b.id.charCodeAt(0) * seed) % 100;
    return valA - valB;
  });
  
  // Take first 5 questions
  const selected = shuffled.slice(0, 5);
  
  return {
    quizId: `fallback-${date}`,
    date: date,
    questions: selected
  };
}
