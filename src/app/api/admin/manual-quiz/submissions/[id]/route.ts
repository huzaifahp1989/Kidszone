import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  getManualSubmissionDetail,
  judgeManualAnswer,
  finalizeManualSubmission,
  isMissingTableError,
} from '@/lib/manual-quiz-server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAdminRequest(_request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const row = await getManualSubmissionDetail(id);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    const asAny = error as { message?: string; code?: string; details?: string } | null | undefined;
    const msg =
      error instanceof Error
        ? error.message
        : asAny?.message
          ? `${asAny.message}${asAny?.code ? ` (code=${asAny.code})` : ''}${asAny?.details ? ` — ${asAny.details}` : ''}`
          : 'Failed';
    if (isMissingTableError(error as { code?: string } | null | undefined)) {
      return NextResponse.json({ error: 'Setup SQL not applied yet', tableMissing: true }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const newStatus = body.newStatus as 'approved' | 'rejected' | 'reviewing' | undefined;
  const adminNotes = body.adminNotes ? String(body.adminNotes) : null;

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
      submissionId: id,
      newStatus,
      adminNotes,
      judgeUserId,
    });
    const refreshed = await getManualSubmissionDetail(id);
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
