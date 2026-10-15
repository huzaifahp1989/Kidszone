import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { WRITTEN_QUESTION_DIFFICULTIES } from '@/lib/written-competition';
import { listAllQuestions, mapQuestionAdmin, WRITTEN_QUESTIONS_TABLE } from '@/lib/written-competition-server';

export const dynamic = 'force-dynamic';

function questionPayload(body: Record<string, unknown>) {
  const difficulty = String(body.difficulty || 'medium');
  return {
    question_number: Math.max(1, Number(body.questionNumber) || 1),
    question_text: String(body.questionText || '').trim(),
    difficulty: (WRITTEN_QUESTION_DIFFICULTIES as readonly string[]).includes(difficulty) ? difficulty : 'medium',
    topic: String(body.topic || '').trim(),
    expected_answer: String(body.expectedAnswer || ''),
    marking_guidance: String(body.markingGuidance || ''),
    max_marks: Math.max(1, Math.min(100, Number(body.maxMarks) || 10)),
    min_required_points: Math.max(0, Number(body.minRequiredPoints) || 0),
    source: String(body.source || ''),
    explanation: String(body.explanation || ''),
    active: body.active == null ? true : Boolean(body.active),
  };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const questions = await listAllQuestions(id);
    return NextResponse.json({ questions });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = questionPayload(body);
    if (!payload.question_text) return NextResponse.json({ error: 'Question text is required.' }, { status: 400 });
    const { data, error } = await supabaseAdmin
      .from(WRITTEN_QUESTIONS_TABLE)
      .insert({ ...payload, competition_id: id })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ question: mapQuestionAdmin(data as Record<string, unknown>) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const questionId = String(body.id || '').trim();
    if (!questionId) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const payload = { ...questionPayload(body), updated_at: new Date().toISOString() };
    const { data, error } = await supabaseAdmin
      .from(WRITTEN_QUESTIONS_TABLE)
      .update(payload)
      .eq('id', questionId)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ question: mapQuestionAdmin(data as Record<string, unknown>) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('questionId');
  if (!questionId) return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
  try {
    await context.params;
    const { error } = await supabaseAdmin.from(WRITTEN_QUESTIONS_TABLE).delete().eq('id', questionId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
