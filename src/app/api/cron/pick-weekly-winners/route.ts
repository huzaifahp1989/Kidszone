import { NextResponse } from 'next/server';
import { autoPickWeeklyWinners } from '@/lib/weekly-winner-picker';
import { authorizeCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isManualRun = searchParams.get('manual') === '1';

  // Automatic weekly winner picking is disabled. Admins pick winners manually.
  if (!isManualRun) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: 'Automatic weekly winner picking is disabled. Use ?manual=1 to run this endpoint manually.',
    });
  }

  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const force = searchParams.get('force') === '1';
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
    console.error('[cron/pick-weekly-winners]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
