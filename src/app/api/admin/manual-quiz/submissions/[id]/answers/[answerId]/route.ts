import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  judgeManualAnswer,
  getManualSubmissionDetail,
  MANUAL_ANSWER_STATUSES,
  type ManualAnswerStatus,
} from '@/lib/manual-quiz-server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; answerId: string }> }
) {
  const { id, answerId } = await params;
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const rawStatus = body.judgeStatus ?? body.status;
  const judgeStatus = (typeof rawStatus === 'string' ? rawStatus : null) as ManualAnswerStatus | null;
  const pointsAwarded = Number(body.pointsAwarded ?? body.points ?? 0);
  const judgeNotes = body.judgeNotes ? String(body.judgeNotes) : null;

  if (!judgeStatus || !MANUAL_ANSWER_STATUSES.includes(judgeStatus)) {
    return NextResponse.json(
      { error: `judgeStatus must be one of: ${MANUAL_ANSWER_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  const authUser = await getAuthenticatedRequestUser(request);
  const judgeUserId = authUser?.id ?? 'admin';

  try {
    await judgeManualAnswer({
      submissionId: id,
      answerId,
      judgeStatus,
      pointsAwarded,
      judgeNotes,
      judgeUserId,
    });
    const updated = await getManualSubmissionDetail(id);
    return NextResponse.json({ ok: true, submission: updated });
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
