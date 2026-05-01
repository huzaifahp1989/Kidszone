import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyReminderToken } from '@/lib/reminder-token';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token') || '';
    const verification = verifyReminderToken(token);

    if (!verification.valid || !verification.uid) {
      return new NextResponse('<h1>Invalid unsubscribe link</h1><p>Please try again from a valid email link.</p>', {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        reminder_opt_in: false,
        reminder_unsubscribed_at: new Date().toISOString(),
      })
      .eq('uid', verification.uid);

    if (error) throw error;

    return new NextResponse(
      '<h1>You are unsubscribed</h1><p>Parent reminder emails have been turned off for this account.</p>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  } catch (error) {
    console.error('unsubscribe error:', error);
    return new NextResponse('<h1>Could not process unsubscribe</h1><p>Please try again later.</p>', {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
