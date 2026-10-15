import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  getAdminSessionConfig,
  isValidAdminPassword,
} from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { password, secret } = getAdminSessionConfig();
  if (!password || !secret) {
    return NextResponse.json(
      { error: 'Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in the server environment before enabling admin review.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Enter the admin password to continue.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Enter the admin password to continue.' }, { status: 400 });
  }
  const credentials = body as Record<string, unknown>;
  if (typeof credentials.password !== 'string') {
    return NextResponse.json({ error: 'Enter the admin password to continue.' }, { status: 400 });
  }
  if (!isValidAdminPassword(credentials.password, password)) {
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin',
    maxAge: 0,
  });
  return response;
}
