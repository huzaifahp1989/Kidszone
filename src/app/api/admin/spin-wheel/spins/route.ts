import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { listSpinWheelSpinsForWeek } from '@/lib/spin-wheel-server';
import { getCurrentSpinWeekStart } from '@/lib/spin-wheel';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const weekStartDate = url.searchParams.get('weekStartDate') || getCurrentSpinWeekStart();
    const data = await listSpinWheelSpinsForWeek(weekStartDate);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Admin spin wheel list error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load spin wheel results' }, { status: 500 });
  }
}
