import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  createPushSchedule,
  deletePushSchedule,
  listPushSchedules,
  runDuePushSchedules,
  sendPushScheduleNow,
  updatePushSchedule,
  type PushFrequency,
} from '@/lib/push-schedules';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listPushSchedulesDetailed } = await import('@/lib/push-schedules');
  const detailed = await listPushSchedulesDetailed();
  return NextResponse.json({
    schedules: detailed.schedules,
    error: detailed.error,
    missingServiceRole: detailed.missingServiceRole,
    migratedAudience: detailed.migratedAudience,
    setupHint:
      detailed.error ||
      (detailed.migratedAudience
        ? `Updated ${detailed.migratedAudience} schedule(s) to Full OneSignal list so they can deliver.`
        : detailed.schedules.length === 0
          ? 'No schedules yet. Create one below. If save fails, set SUPABASE_SERVICE_ROLE_KEY and run SETUP_PUSH_SCHEDULES.sql.'
          : undefined),
  });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action || '').trim();

    if (action === 'run_due') {
      const result = await runDuePushSchedules();
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === 'send_now') {
      const id = String(body?.id || '').trim();
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      const result = await sendPushScheduleNow(id);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error || 'Send failed', recipients: result.recipients ?? 0 },
          { status: 502 }
        );
      }
      return NextResponse.json(result);
    }

    const title = String(body?.title || '').trim();
    const message = String(body?.body || '').trim();
    const url = String(body?.url || '/quiz').trim() || '/quiz';
    const audience = String(body?.audience || 'onesignal').trim() || 'onesignal';
    const frequency = String(body?.frequency || '').trim() as PushFrequency;
    const timeOfDay = String(body?.timeOfDay || body?.time_of_day || '').trim();
    const dayOfWeek =
      body?.dayOfWeek === '' || body?.dayOfWeek === null || body?.dayOfWeek === undefined
        ? null
        : Number(body.dayOfWeek);
    const daysOfWeek = Array.isArray(body?.daysOfWeek)
      ? body.daysOfWeek.map((d: unknown) => Number(d)).filter((d: number) => Number.isFinite(d))
      : Array.isArray(body?.days_of_week)
        ? body.days_of_week.map((d: unknown) => Number(d)).filter((d: number) => Number.isFinite(d))
        : dayOfWeek != null
          ? [dayOfWeek]
          : null;
    const timezone = String(body?.timezone || 'Europe/London').trim() || 'Europe/London';
    const enabled = body?.enabled !== false;

    if (!title || !message) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }
    if (frequency !== 'daily' && frequency !== 'weekly') {
      return NextResponse.json({ error: 'frequency must be daily or weekly' }, { status: 400 });
    }

    const result = await createPushSchedule({
      title,
      body: message,
      url,
      imageUrl: String(body?.imageUrl || body?.image_url || '').trim() || null,
      audience,
      frequency,
      timeOfDay,
      dayOfWeek: daysOfWeek?.[0] ?? dayOfWeek,
      daysOfWeek,
      timezone,
      enabled,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      schedule: result.schedule,
      warning: result.warning,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create schedule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const patch: Parameters<typeof updatePushSchedule>[1] = {};
    if (body.title !== undefined) patch.title = String(body.title).trim();
    if (body.body !== undefined) patch.body = String(body.body).trim();
    if (body.url !== undefined) patch.url = String(body.url).trim();
    if (body.imageUrl !== undefined || body.image_url !== undefined) {
      patch.imageUrl = String(body.imageUrl ?? body.image_url ?? '').trim() || null;
    }
    if (body.audience !== undefined) patch.audience = String(body.audience).trim();
    if (body.frequency !== undefined) {
      patch.frequency = String(body.frequency).trim() as PushFrequency;
    }
    if (body.timeOfDay !== undefined || body.time_of_day !== undefined) {
      patch.timeOfDay = String(body.timeOfDay || body.time_of_day).trim();
    }
    if (body.dayOfWeek !== undefined || body.day_of_week !== undefined) {
      const raw = body.dayOfWeek ?? body.day_of_week;
      patch.dayOfWeek = raw === '' || raw === null ? null : Number(raw);
    }
    if (body.daysOfWeek !== undefined || body.days_of_week !== undefined) {
      const raw = body.daysOfWeek ?? body.days_of_week;
      patch.daysOfWeek = Array.isArray(raw)
        ? raw.map((d: unknown) => Number(d)).filter((d: number) => Number.isFinite(d))
        : null;
    }
    if (body.timezone !== undefined) patch.timezone = String(body.timezone).trim();
    if (body.enabled !== undefined) patch.enabled = Boolean(body.enabled);

    const result = await updatePushSchedule(id, patch);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      schedule: result.schedule,
      warning: result.warning,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update schedule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || searchParams.get('id') || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const result = await deletePushSchedule(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Delete failed' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete schedule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
