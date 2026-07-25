import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { buildSupabaseHealthReport } from '@/lib/supabase-health-report';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await buildSupabaseHealthReport();
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to build Supabase health report' },
      { status: 500 }
    );
  }
}
