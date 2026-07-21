import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { performSpinWheel } from '@/lib/spin-wheel-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const result = await performSpinWheel(user.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error, spin: result.spin ?? null }, { status: 400 });
    }

    return NextResponse.json({ success: true, spin: result.spin });
  } catch (error: any) {
    console.error('Spin wheel spin error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to spin the wheel' }, { status: 500 });
  }
}
