import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = [
  'Quran Basics',
  'Duas',
  'Salah & Wudu',
  'Seerah',
  'Islamic Manners',
  'Hadith',
  'Prophets',
  'Quran Stories',
  'Akhlaq',
];

function mapQuestion(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    category: String(row.category || ''),
    question_text: String(row.question_text || ''),
    options: Array.isArray(row.options) ? row.options : [],
    correct_answer_index: Number(row.correct_answer_index ?? 0),
    explanation: row.explanation ? String(row.explanation) : '',
    difficulty: String(row.difficulty || 'Medium'),
    reference: row.reference ? String(row.reference) : '',
    created_at: row.created_at ? String(row.created_at) : null,
  };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 100)));

    let query = supabaseAdmin
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ questions: (data || []).map((row) => mapQuestion(row as Record<string, unknown>)) });
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
    const category = String(body.category || '').trim();
    const question_text = String(body.question_text || body.question || '').trim();
    const options = Array.isArray(body.options) ? body.options.map(String) : [];
    const correct_answer_index = Number(body.correct_answer_index ?? body.correctIndex ?? 0);
    const explanation = String(body.explanation || '').trim();
    const difficulty = String(body.difficulty || 'Medium').trim();
    const reference = String(body.reference || '').trim();

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Valid category is required.' }, { status: 400 });
    }
    if (!question_text) {
      return NextResponse.json({ error: 'Question text is required.' }, { status: 400 });
    }
    if (options.length < 2) {
      return NextResponse.json({ error: 'At least 2 options are required.' }, { status: 400 });
    }
    if (correct_answer_index < 0 || correct_answer_index >= options.length) {
      return NextResponse.json({ error: 'Invalid correct answer index.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert({
        category,
        question_text,
        options,
        correct_answer_index,
        explanation: explanation || null,
        difficulty,
        reference: reference || null,
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

    const patch: Record<string, unknown> = {};
    if (body.category != null) patch.category = String(body.category);
    if (body.question_text != null) patch.question_text = String(body.question_text);
    if (body.question != null) patch.question_text = String(body.question);
    if (body.options != null) patch.options = Array.isArray(body.options) ? body.options.map(String) : [];
    if (body.correct_answer_index != null) patch.correct_answer_index = Number(body.correct_answer_index);
    if (body.explanation != null) patch.explanation = String(body.explanation);
    if (body.difficulty != null) patch.difficulty = String(body.difficulty);
    if (body.reference != null) patch.reference = String(body.reference);

    const { data, error } = await supabaseAdmin.from('questions').update(patch).eq('id', id).select('*').single();
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

    const { error } = await supabaseAdmin.from('questions').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
