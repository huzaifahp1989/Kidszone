import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  ALL_REMINDER_KEYS,
  isValidTime,
  mergeReminderSettings,
  type UserReminderSettings,
} from '@/lib/reminder-types';
import { isValidIanaTimeZone } from '@/lib/user-reminder-schedule';
import { isOneSignalServerConfigured } from '@/lib/onesignal-server';
import { sendUserPush } from '@/lib/user-push';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const userId = String(searchParams.get('userId') || '').trim();
  const query = String(searchParams.get('q') || '').trim().slice(0, 100);

  if (userId) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('uid, name, email, reminder_settings, reminder_timezone')
      .eq('uid', userId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Learner not found.' }, { status: 404 });

    return NextResponse.json({
      user: { uid: data.uid, name: data.name || '', email: data.email || '' },
      settings: mergeReminderSettings(data.reminder_settings as UserReminderSettings | null),
      timezone: data.reminder_timezone || 'Europe/London',
    });
  }

  if (query.length < 2) {
    return NextResponse.json({ error: 'Enter at least two characters to search learners.' }, { status: 400 });
  }

  const safeQuery = query.replace(/[%_]/g, '');
  if (!safeQuery) {
    return NextResponse.json({ error: 'Enter a valid learner name or email.' }, { status: 400 });
  }

  const [nameResult, emailResult] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('uid, name, email')
      .ilike('name', `%${safeQuery}%`)
      .limit(20),
    supabaseAdmin
      .from('users')
      .select('uid, name, email')
      .ilike('email', `%${safeQuery}%`)
      .limit(20),
  ]);

  if (nameResult.error || emailResult.error) {
    return NextResponse.json(
      { error: nameResult.error?.message || emailResult.error?.message || 'Learner search failed.' },
      { status: 500 }
    );
  }

  const usersById = new Map<string, { uid: string; name: string; email: string }>();
  for (const row of [...(nameResult.data || []), ...(emailResult.data || [])]) {
    usersById.set(String(row.uid), {
      uid: String(row.uid),
      name: String(row.name || ''),
      email: String(row.email || ''),
    });
  }

  return NextResponse.json({ users: Array.from(usersById.values()).slice(0, 30) });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  const body = await request.json().catch(() => null);
  const userId = String(body?.userId || '').trim();
  const action = String(body?.action || '');

  if (!userId) return NextResponse.json({ error: 'Select a learner first.' }, { status: 400 });

  if (action === 'save') {
    if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) {
      return NextResponse.json({ error: 'Reminder settings are required.' }, { status: 400 });
    }

    const timezone = String(body.timezone || '').trim();
    if (!isValidIanaTimeZone(timezone)) {
      return NextResponse.json({ error: 'Enter a valid IANA timezone.' }, { status: 400 });
    }

    for (const key of ALL_REMINDER_KEYS) {
      const entry = body.settings[key];
      if (!entry || typeof entry.enabled !== 'boolean' || !isValidTime(String(entry.time || ''))) {
        return NextResponse.json({ error: `Choose a valid time for ${key}.` }, { status: 400 });
      }
    }

    const settings = mergeReminderSettings(body.settings as UserReminderSettings);
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ reminder_settings: settings, reminder_timezone: timezone })
      .eq('uid', userId)
      .select('uid')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Learner not found.' }, { status: 404 });

    return NextResponse.json({ ok: true, settings, timezone });
  }

  if (action === 'test') {
    if (!isOneSignalServerConfigured()) {
      return NextResponse.json(
        { error: 'OneSignal server push is not configured for this deployment.' },
        { status: 503 }
      );
    }

    const { data: user, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('uid')
      .eq('uid', userId)
      .maybeSingle();
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
    if (!user) return NextResponse.json({ error: 'Learner not found.' }, { status: 404 });

    const result = await sendUserPush({
      userId,
      title: 'Test reminder',
      body: 'This is a test notification from Kids Zone. Your reminder schedule has not been changed.',
      url: '/reminders',
    });

    if (!result.sent || result.recipients <= 0) {
      return NextResponse.json(
        {
          error: result.reason || 'OneSignal accepted no subscribed devices for this learner.',
          recipients: result.recipients,
          perApp: result.perApp,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      recipients: result.recipients,
      perApp: result.perApp,
    });
  }

  return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
}
