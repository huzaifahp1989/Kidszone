import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { quizzes } from '@/data/quizzes';

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service Role Key missing' }, { status: 500 });
    }

    // Map quizzes to DB format
    const allQuestions = quizzes.map(q => ({
      category: q.category,
      question_text: q.question,
      options: q.options,
      correct_answer_index: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      reference: 'General Knowledge'
    }));

    // Insert into DB
    const { error } = await supabaseAdmin
      .from('questions')
      .insert(allQuestions);

    if (error) {
      console.error('Seed error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: allQuestions.length,
      message: 'Questions seeded successfully' 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
