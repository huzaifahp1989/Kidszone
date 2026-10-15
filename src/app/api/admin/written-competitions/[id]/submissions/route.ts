import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SUBMISSION_STATUS_LABELS, type WrittenSubmissionStatus } from '@/lib/written-competition';
import { mapSubmission, WRITTEN_SUBMISSIONS_TABLE } from '@/lib/written-competition-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const status = new URL(request.url).searchParams.get('status');

  try {
    let query = supabaseAdmin
      .from(WRITTEN_SUBMISSIONS_TABLE)
      .select('*')
      .eq('competition_id', id)
      .order('submitted_at', { ascending: false });
    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    const submissions = (data || []).map((row) => mapSubmission(row as Record<string, unknown>));
    const stats: Record<string, number> = { total: submissions.length };
    for (const key of Object.keys(SUBMISSION_STATUS_LABELS) as WrittenSubmissionStatus[]) {
      stats[key] = submissions.filter((item) => item.status === key).length;
    }
    stats.pendingQueue = stats.pending_review + stats.under_review;

    return NextResponse.json({ submissions, stats });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
