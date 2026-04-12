import { NextResponse } from 'next/server';
import { generateDailyQuiz } from '@/lib/quiz-generator';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await generateDailyQuiz(today);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
