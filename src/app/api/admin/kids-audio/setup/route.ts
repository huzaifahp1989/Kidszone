import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { KIDS_AUDIO_SETUP_SQL } from '@/lib/kids-audio';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    setupSql: KIDS_AUDIO_SETUP_SQL,
    instructions:
      'Run this SQL in the Supabase SQL editor, then refresh the Kids Audio admin page.',
  });
}
