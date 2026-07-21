import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { autoPickWeeklyWinners } from '@/lib/weekly-winner-picker';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const force = Boolean((body as { force?: boolean }).force);
    const result = await autoPickWeeklyWinners({ force });

    return NextResponse.json({
      success: result.ok,
      skipped: result.skipped ?? false,
      message: result.message,
      pickedWeekStartDate: result.pickedWeekStartDate,
      spinWeekStartDate: result.spinWeekStartDate,
      winners: result.winners,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
