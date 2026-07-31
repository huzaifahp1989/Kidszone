import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  listManualSubmissions,
  getManualSubmissionDetail,
  finalizeManualSubmission,
  MANUAL_QUIZ_STATUSES,
  isMissingTableError,
  type ManualQuizStatus,
} from '@/lib/manual-quiz-server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const quizKey = searchParams.get('quizKey') || undefined;
  const rawStatus = searchParams.get('status') || undefined;
  const rawLimit = Number(searchParams.get('limit')) || undefined;

  let status: ManualQuizStatus | undefined;
  if (rawStatus && MANUAL_QUIZ_STATUSES.includes(rawStatus as ManualQuizStatus)) {
    status = rawStatus as ManualQuizStatus;
  }

  try {
    const result = await listManualSubmissions({
      quizKey,
      status,
      limit: rawLimit ? Math.min(500, rawLimit) : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    const asAny = error as { message?: string; code?: string; details?: string } | null | undefined;
    const msg =
      error instanceof Error
        ? error.message
        : asAny?.message
          ? `${asAny.message}${asAny?.code ? ` (code=${asAny.code})` : ''}${asAny?.details ? ` — ${asAny.details}` : ''}`
          : 'Failed';
    if (isMissingTableError(error as { code?: string } | null | undefined)) {
      return NextResponse.json(
        {
          submissions: [],
          counts: { pending: 0, reviewing: 0, approved: 0, rejected: 0 },
          tableMissing: true,
          error: 'Setup SQL has not been applied yet.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const submissionId = String(body.submissionId || body.id || '').trim();
  const newStatus = body.newStatus as 'approved' | 'rejected' | 'reviewing' | undefined;
  const adminNotes = body.adminNotes ? String(body.adminNotes) : null;

  if (!submissionId) return NextResponse.json({ error: 'submissionId required' }, { status: 400 });
  if (!newStatus || !['approved', 'rejected', 'reviewing'].includes(newStatus)) {
    return NextResponse.json(
      { error: 'newStatus must be approved, rejected, or reviewing' },
      { status: 400 }
    );
  }

  const authUser = await getAuthenticatedRequestUser(request);
  const judgeUserId = authUser?.id ?? 'admin';

  try {
    const res = await finalizeManualSubmission({
      submissionId,
      newStatus,
      adminNotes,
      judgeUserId,
    });
    const refreshed = await getManualSubmissionDetail(submissionId);
    return NextResponse.json({ ...res, detail: refreshed });
  } catch (error) {
    const asAny = error as { message?: string; code?: string; details?: string } | null | undefined;
    const msg =
      error instanceof Error
        ? error.message
        : asAny?.message
          ? `${asAny.message}${asAny?.code ? ` (code=${asAny.code})` : ''}${asAny?.details ? ` — ${asAny.details}` : ''}`
          : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
