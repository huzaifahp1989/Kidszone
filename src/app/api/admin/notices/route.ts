import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  buildAdminNoticeRow,
  validateAdminNoticeInput,
  type AdminUpsertNoticeInput,
} from '@/lib/global-notices';

export const dynamic = 'force-dynamic';

const checkAdminAuth = (request: Request) => {
  const authHeader = request.headers.get('x-admin-auth');
  return authHeader === 'true';
};

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get('limit');
    const limit = Number.isFinite(Number(limitRaw))
      ? Math.max(1, Math.min(500, Math.floor(Number(limitRaw))))
      : 200;
    const { data, error } = await supabaseAdmin
      .from('global_notices')
      .select('*')
      .order('publish_at', { ascending: false })
      .limit(limit);
    if (error) {
      if (String(error.message || '').includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'Notices table not configured yet. Apply migration 20260829_create_global_notices.sql.',
            setupRequired: true,
          },
          { status: 500 }
        );
      }
      throw error;
    }
    return NextResponse.json({ notices: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Partial<AdminUpsertNoticeInput>;
    const invalid = validateAdminNoticeInput(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    const row = buildAdminNoticeRow(body as AdminUpsertNoticeInput);
    const { data, error } = await supabaseAdmin
      .from('global_notices')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ notice: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Partial<AdminUpsertNoticeInput> & { id?: string };
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const invalid = validateAdminNoticeInput(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const update: Record<string, any> = {};
    const row = buildAdminNoticeRow(body as AdminUpsertNoticeInput);
    Object.assign(update, row);

    const { data, error } = await supabaseAdmin
      .from('global_notices')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ notice: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = (await request.json().catch(() => ({}))) as any;
      id = typeof body?.id === 'string' ? body.id : '';
    }
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const viewsDel = await supabaseAdmin
      .from('global_notice_views')
      .delete()
      .eq('notice_id', id);
    if (viewsDel.error && !String(viewsDel.error.message || '').includes('does not exist')) {
      // non-fatal: continue to delete notice
    }

    const { error } = await supabaseAdmin.from('global_notices').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
