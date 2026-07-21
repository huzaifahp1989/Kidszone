import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  addSpinWheelWinner,
  listSpinWheelSelectedWinners,
  removeSpinWheelWinner,
  searchUsersForSpinWheel,
} from '@/lib/spin-wheel-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    if (query.trim()) {
      const results = await searchUsersForSpinWheel(query);
      return NextResponse.json({ results });
    }

    const data = await listSpinWheelSelectedWinners();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Admin spin wheel winners GET error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load spin wheel winners' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userId = String(body?.userId || '').trim();
    const result = await addSpinWheelWinner(userId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const data = await listSpinWheelSelectedWinners();
    return NextResponse.json({ success: true, added: result, ...data });
  } catch (error: any) {
    console.error('Admin spin wheel winners POST error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to add spin wheel winner' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || '';
    const result = await removeSpinWheelWinner(userId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const data = await listSpinWheelSelectedWinners();
    return NextResponse.json({ success: true, removedUserId: result.userId, ...data });
  } catch (error: any) {
    console.error('Admin spin wheel winners DELETE error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to remove spin wheel winner' }, { status: 500 });
  }
}
