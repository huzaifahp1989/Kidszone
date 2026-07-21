import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';

/** Block debug routes in production unless admin header is present. */
export function guardDebugRoute(request: Request): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null;
  if (isAdminRequest(request)) return null;
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
