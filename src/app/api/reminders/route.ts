import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { mergeReminderSettings, ALL_REMINDER_KEYS, isValidTime } from '@/lib/reminder-types';
import {
  isOneSignalPrimaryServerConfigured,
  isOneSignalWebServerConfigured,
} from '@/lib/onesignal-server-config';
import { isValidIanaTimeZone } from '@/lib/user-reminder-schedule';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('reminder_settings, reminder_timezone')
    .eq('uid', user.id)
    .maybeSingle();

  if (error) {
    if (/reminder_settings|reminder_timezone|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json(
        {
          error: 'Reminder database setup is required.',
          setupRequired: true,
          details: error.message,
          hint: 'Run supabase/migrations/20261006_user_activity_reminders.sql in Supabase SQL Editor.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Your learner profile is missing. Sign out and sign in again, then retry.' },
      { status: 409 }
    );
  }

  return NextResponse.json({
    settings: mergeReminderSettings(data?.reminder_settings),
    timezone: data?.reminder_timezone || 'Europe/London',
    webPushConfigured: isOneSignalWebServerConfigured(),
    nativePushConfigured: isOneSignalPrimaryServerConfigured(),
  });
}

export async function HEAD(request: Request) {
  return GET(request);
}

export async function POST(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || !body.settings || typeof body.settings !== 'object') {
    return NextResponse.json({ error: 'Reminder settings are required.' }, { status: 400 });
  }

  const timezone = String(body?.timezone || '').trim();

  if (!timezone || !isValidIanaTimeZone(timezone)) {
    return NextResponse.json({ error: 'Choose a valid device timezone before saving reminders.' }, { status: 400 });
  }

  for (const key of ALL_REMINDER_KEYS) {
    const entry = body.settings[key];
    if (!entry || typeof entry.enabled !== 'boolean' || !isValidTime(String(entry.time || ''))) {
      return NextResponse.json({ error: `Please choose a valid time for ${key}.` }, { status: 400 });
    }
  }

  const settings = mergeReminderSettings(body.settings);
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ reminder_settings: settings, reminder_timezone: timezone })
    .eq('uid', user.id)
    .select('uid')
    .maybeSingle();

  if (error) {
    if (/reminder_settings|reminder_timezone|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json(
        {
          error: 'Reminder database setup is required.',
          details: error.message,
          hint: 'Run supabase/migrations/20261006_user_activity_reminders.sql in Supabase SQL Editor.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Your learner profile is missing. Sign out and sign in again, then retry.' },
      { status: 409 }
    );
  }

  return NextResponse.json({
    settings,
    timezone,
    webPushConfigured: isOneSignalWebServerConfigured(),
    nativePushConfigured: isOneSignalPrimaryServerConfigured(),
  });
}

export async function PUT(request: Request) {
  return POST(request);
}
