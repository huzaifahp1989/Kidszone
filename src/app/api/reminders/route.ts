import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { mergeReminderSettings, type UserReminderSettings } from '@/lib/reminder-types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('reminder_settings')
    .eq('uid', user.id)
    .maybeSingle();

  if (error) {
    if (/reminder_settings|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ settings: mergeReminderSettings({}), setupRequired: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: mergeReminderSettings(data?.reminder_settings) });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const body = await request.json();
  const settings = mergeReminderSettings(body?.settings);

  const { error } = await supabaseAdmin
    .from('users')
    .update({ reminder_settings: settings, updated_at: new Date().toISOString() })
    .eq('uid', user.id);

  if (error) {
    if (/reminder_settings|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json(
        { error: 'reminder_settings column missing — run SETUP_USER_REMINDERS.sql in Supabase' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings });
}
