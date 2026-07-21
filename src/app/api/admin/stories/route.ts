import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function mapStory(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    summary: String(row.summary || ''),
    content: String(row.content || ''),
    age_min: Number(row.age_min ?? 5),
    age_max: Number(row.age_max ?? 12),
    is_active: Boolean(row.is_active ?? true),
    created_at: row.created_at ? String(row.created_at) : null,
  };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('stories')
      .select('*')
      .order('title', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ stories: (data || []).map((row) => mapStory(row as Record<string, unknown>)) });
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
    const title = String(body.title || '').trim();
    const summary = String(body.summary || '').trim();
    const content = String(body.content || '').trim();
    const age_min = Number(body.age_min ?? 5);
    const age_max = Number(body.age_max ?? 12);
    const is_active = body.is_active !== false;

    if (!title || !summary) {
      return NextResponse.json({ error: 'Title and summary are required.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('stories')
      .insert({ title, summary, content, age_min, age_max, is_active })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ story: mapStory(data as Record<string, unknown>) });
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
    if (body.title != null) patch.title = String(body.title);
    if (body.summary != null) patch.summary = String(body.summary);
    if (body.content != null) patch.content = String(body.content);
    if (body.age_min != null) patch.age_min = Number(body.age_min);
    if (body.age_max != null) patch.age_max = Number(body.age_max);
    if (body.is_active != null) patch.is_active = Boolean(body.is_active);

    const { data, error } = await supabaseAdmin.from('stories').update(patch).eq('id', id).select('*').single();
    if (error) throw error;

    return NextResponse.json({ story: mapStory(data as Record<string, unknown>) });
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

    const { error } = await supabaseAdmin.from('stories').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
