import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Automatic weekly winner selection is disabled. Choose winners manually in Admin.' },
    { status: 410 }
  );
}
