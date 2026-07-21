import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { getSpinWheelStatus } from '@/lib/spin-wheel-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const status = await getSpinWheelStatus(user.id);
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Spin wheel status error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load spin wheel status' }, { status: 500 });
  }
}
