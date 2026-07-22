import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { isChallengeQuizKey } from '@/data/challenge-quizzes';
import { CHALLENGE_QUESTIONS_TABLE, isMissingTableError } from '@/lib/challenge-quiz-server';

export const dynamic = 'force-dynamic';

function mapQuestion(row: Record<string, unknown>) {
  const accepted = row.accepted_answers;
  return {
    id: String(row.id),
    quiz_key: String(row.quiz_key || ''),
    prompt: String(row.prompt || ''),
    answer: String(row.answer || ''),
    accepted_answers: Array.isArray(accepted) ? accepted.map((a) => String(a)) : [],
    explanation: row.explanation ? String(row.explanation) : '',
    is_bonus: Boolean(row.is_bonus),
    points: Number(row.points ?? 1) || 1,
    sort_order: Number(row.sort_order ?? 0),
    active: row.active == null ? true : Boolean(row.active),
  };
}

function parseAccepted(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const quiz = searchParams.get('quiz');

    let query = supabaseAdmin
      .from(CHALLENGE_QUESTIONS_TABLE)
      .select('*')
      .order('quiz_key', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (quiz && isChallengeQuizKey(quiz)) query = query.eq('quiz_key', quiz);

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ questions: [], tableMissing: true });
      }
      throw error;
    }
    return NextResponse.json({ questions: (data || []).map((r) => mapQuestion(r as Record<string, unknown>)) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const quiz_key = String(body.quiz_key || '').trim();
    const prompt = String(body.prompt || '').trim();
    const answer = String(body.answer || '').trim();

    if (!isChallengeQuizKey(quiz_key)) {
      return NextResponse.json({ error: 'quiz_key must be "quran-stories" or "fiqh".' }, { status: 400 });
    }
    if (!prompt) return NextResponse.json({ error: 'Question text is required.' }, { status: 400 });
    if (!answer) return NextResponse.json({ error: 'A correct answer is required.' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from(CHALLENGE_QUESTIONS_TABLE)
      .insert({
        quiz_key,
        prompt,
        answer,
        accepted_answers: parseAccepted(body.accepted_answers),
        explanation: String(body.explanation || '').trim() || null,
        is_bonus: Boolean(body.is_bonus),
        points: Number(body.points ?? (body.is_bonus ? 2 : 1)) || 1,
        sort_order: Number(body.sort_order ?? 0) || 0,
        active: body.active == null ? true : Boolean(body.active),
      })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ question: mapQuestion(data as Record<string, unknown>) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.quiz_key != null && isChallengeQuizKey(String(body.quiz_key))) patch.quiz_key = String(body.quiz_key);
    if (body.prompt != null) patch.prompt = String(body.prompt);
    if (body.answer != null) patch.answer = String(body.answer);
    if (body.accepted_answers != null) patch.accepted_answers = parseAccepted(body.accepted_answers);
    if (body.explanation != null) patch.explanation = String(body.explanation) || null;
    if (body.is_bonus != null) patch.is_bonus = Boolean(body.is_bonus);
    if (body.points != null) patch.points = Number(body.points) || 1;
    if (body.sort_order != null) patch.sort_order = Number(body.sort_order) || 0;
    if (body.active != null) patch.active = Boolean(body.active);

    const { data, error } = await supabaseAdmin
      .from(CHALLENGE_QUESTIONS_TABLE)
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ question: mapQuestion(data as Record<string, unknown>) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabaseAdmin.from(CHALLENGE_QUESTIONS_TABLE).delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
