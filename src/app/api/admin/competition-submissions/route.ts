import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function requireAdmin(req: Request) {
  const auth = req.headers.get('x-admin-auth');
  return auth === 'true';
}

export async function GET(req: Request) {
  try {
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const competitionKey = (searchParams.get('competitionKey') || '').trim();
    const status = (searchParams.get('status') || 'all').trim();

    if (!competitionKey) {
      return NextResponse.json({ error: 'competitionKey is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('admin_list_competition_submissions', {
      p_competition_key: competitionKey,
      p_status: status,
      p_limit: 200,
      p_offset: 0,
    });

    if (error) {
      const base = supabaseAdmin
        .from('masjid_al_aqsa_quiz_submissions')
        .select('*')
        .eq('competition_key', competitionKey)
        .order('created_at', { ascending: false })
        .limit(200);

      const q = status && status !== 'all' ? base.eq('status', status) : base;
      const { data: rows, error: fbErr } = await q;

      if (fbErr) {
        return NextResponse.json(
          {
            error:
              'Admin competition submissions RPC is missing in Supabase. Apply migrations (or create the function), then reload Supabase API schema cache.',
            details: `${error.message}${fbErr?.message ? ` | ${fbErr.message}` : ''}`,
            setupRequired: true,
          },
          { status: 503 }
        );
      }

      return NextResponse.json({ submissions: rows ?? [] });
    }

    if (data && typeof data === 'object' && !Array.isArray(data) && (data as any).error) {
      return NextResponse.json({ error: (data as any).error, setupRequired: true }, { status: 503 });
    }

    return NextResponse.json({ submissions: Array.isArray(data) ? data : [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : '';
    const questionMarks = Array.isArray(body?.questionMarks) ? body.questionMarks : null;
    const bonusMarks = Number(body?.bonusMarks ?? 0);
    const status = typeof body?.status === 'string' ? body.status : null;
    const adminNotes = typeof body?.adminNotes === 'string' ? body.adminNotes.slice(0, 2000) : null;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    if (!Array.isArray(questionMarks) || questionMarks.length !== 10) {
      return NextResponse.json({ error: 'questionMarks must be an array of 10 numbers' }, { status: 400 });
    }
    const sanitizedMarks = questionMarks.map((v: any) => (Number(v) >= 1 ? 1 : 0));
    const sanitizedBonus = Number.isFinite(bonusMarks) ? Math.max(0, Math.min(5, Math.round(bonusMarks))) : 0;

    const { data, error } = await supabaseAdmin.rpc('admin_update_competition_submission', {
      p_id: id,
      p_question_marks: sanitizedMarks,
      p_bonus_marks: sanitizedBonus,
      p_status: status,
      p_admin_notes: adminNotes,
    });

    if (error) {
      const finalStatus = typeof status === 'string' && status.trim() ? status.trim() : null;
      const reviewAt =
        finalStatus && (finalStatus === 'approved' || finalStatus === 'rejected') ? new Date().toISOString() : null;

      const update: Record<string, any> = {
        question_marks: sanitizedMarks,
        bonus_marks: sanitizedBonus,
        ...(finalStatus ? { status: finalStatus } : {}),
        ...(adminNotes ? { admin_notes: adminNotes } : {}),
        ...(reviewAt ? { reviewed_at: reviewAt } : {}),
      };

      const { data: row, error: fbErr } = await supabaseAdmin
        .from('masjid_al_aqsa_quiz_submissions')
        .update(update)
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (fbErr) {
        return NextResponse.json(
          {
            error:
              'Admin competition submission update RPC is missing in Supabase. Apply migrations (or create the function), then reload Supabase API schema cache.',
            details: `${error.message}${fbErr?.message ? ` | ${fbErr.message}` : ''}`,
            setupRequired: true,
          },
          { status: 503 }
        );
      }

      return NextResponse.json({ submission: row });
    }

    return NextResponse.json({ submission: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

