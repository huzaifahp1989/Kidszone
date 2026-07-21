'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarClock, ImagePlus, Search, Send, UserRound, X } from 'lucide-react';
import { Button } from '@/components';
import { PUSH_REMINDER_PRESETS, getPushReminderPreset } from '@/lib/push-reminder-presets';

type RegisteredUser = {
  userId: string;
  name: string;
  email: string;
  platform: string;
  tokenPreview: string;
};

type PushScheduleRow = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  image_url?: string | null;
  audience: string;
  frequency: 'daily' | 'weekly';
  time_of_day: string;
  day_of_week: number | null;
  days_of_week?: number[] | null;
  timezone: string;
  enabled: boolean;
  last_sent_at: string | null;
  next_run_at: string | null;
  created_at: string;
};

type SearchImage = {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  creator?: string | null;
  license?: string | null;
};

type StatusInfo = {
  configured: boolean;
  onesignalTokens: number;
  presets: string[];
  registeredUsers: RegisteredUser[];
  serverAppId?: string;
  legacyAppId?: string;
  legacyConfigured?: boolean;
  appsTargeted?: Array<{ label: string; appId: string }>;
  campaigns?: Array<{
    id: string;
    title: string;
    body: string;
    audience: string;
    recipients: number;
    opens: number;
    createdAt: string;
    strategy?: string | null;
  }>;
  setupHint?: string;
};

const PRESET_OPTIONS = [
  { key: '', label: 'Custom message' },
  ...PUSH_REMINDER_PRESETS.map((p) => ({ key: p.key, label: p.label })),
];

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

function scheduleDaysLabel(row: {
  frequency: string;
  day_of_week: number | null;
  days_of_week?: number[] | null;
}) {
  if (row.frequency !== 'weekly') return 'Every day';
  const days =
    Array.isArray(row.days_of_week) && row.days_of_week.length
      ? row.days_of_week
      : row.day_of_week != null
        ? [row.day_of_week]
        : [];
  if (!days.length) return 'Weekly';
  if (days.length === 7) return 'Every day';
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_OPTIONS.find((o) => o.value === d)?.short || String(d))
    .join(', ');
}

const OPEN_PATH_PRESETS = [
  { path: '/', label: 'Home' },
  { path: '/quiz', label: 'Quiz' },
  { path: '/salah', label: 'Salah' },
  { path: '/quran/learn', label: 'Quran' },
  { path: '/games', label: 'Games' },
  { path: '/leaderboard', label: 'Leaderboard' },
  { path: '/rewards', label: 'Rewards' },
  { path: '/profile', label: 'Profile' },
  { path: '/kids-zone', label: 'Kids Zone' },
];

function audienceLabel(value: string) {
  if (value === 'onesignal' || value === 'subscribed') return 'Full OneSignal list';
  if (value === 'kids_zone' || value === 'tokens') return 'Kids Zone push sign-ups';
  if (value === 'all') return 'Both lists';
  if (value === 'user') return 'Single user';
  return value;
}

export default function AdminPushPage() {
  const router = useRouter();
  const [info, setInfo] = useState<StatusInfo | null>(null);
  const [preset, setPreset] = useState('daily_quiz');
  const [title, setTitle] = useState('Daily Quiz is ready!');
  const [body, setBody] = useState("Open Kids Zone and earn points with today's Islamic quiz.");
  const [url, setUrl] = useState('/quiz');
  const [wtnAppId, setWtnAppId] = useState('');
  const [audience, setAudience] = useState<'all' | 'user' | 'onesignal' | 'kids_zone'>('onesignal');
  const [userId, setUserId] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [searchHits, setSearchHits] = useState<Array<{ uid: string; name: string; email: string }>>(
    []
  );
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnoseText, setDiagnoseText] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [schedules, setSchedules] = useState<PushScheduleRow[]>([]);
  const [scheduleHint, setScheduleHint] = useState<string | null>(null);
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly'>('daily');
  const [scheduleTime, setScheduleTime] = useState('16:00');
  const [scheduleDays, setScheduleDays] = useState<number[]>([1]);
  const [scheduleUrl, setScheduleUrl] = useState('/quiz');
  const [scheduleAudience, setScheduleAudience] = useState<'onesignal' | 'kids_zone' | 'all'>(
    'onesignal'
  );
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageQuery, setImageQuery] = useState('islamic kids mosque');
  const [imageResults, setImageResults] = useState<SearchImage[]>([]);
  const [imageSearching, setImageSearching] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const selectedRegistered = useMemo(
    () => info?.registeredUsers.find((u) => u.userId === userId) || null,
    [info?.registeredUsers, userId]
  );

  const loadSchedules = () => {
    fetch('/api/admin/push/schedules', { headers: { 'x-admin-auth': 'true' } })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.schedules)) setSchedules(data.schedules);
        setScheduleHint(data?.error || data?.setupHint || null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin/login');
      return;
    }

    fetch('/api/admin/push/send', { headers: { 'x-admin-auth': 'true' } })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          setError(data.error);
          return;
        }
        setInfo(data as StatusInfo);
      })
      .catch(() => setError('Could not load push status'));

    loadSchedules();
  }, [router]);

  useEffect(() => {
    const ready = getPushReminderPreset(preset);
    if (!ready) return;
    setTitle(ready.title);
    setBody(ready.body);
    setUrl(ready.url);
    setScheduleUrl(ready.url);
    if (ready.suggestedTime) setScheduleTime(ready.suggestedTime);
    if (ready.suggestedFrequency) setScheduleFrequency(ready.suggestedFrequency);
    if (typeof ready.suggestedDay === 'number') setScheduleDays([ready.suggestedDay]);
  }, [preset]);

  const applyReminder = (key: string) => {
    setPreset(key);
    const ready = getPushReminderPreset(key);
    if (!ready) return;
    setTitle(ready.title);
    setBody(ready.body);
    setUrl(ready.url);
    setScheduleUrl(ready.url);
    if (ready.suggestedTime) setScheduleTime(ready.suggestedTime);
    if (ready.suggestedFrequency) setScheduleFrequency(ready.suggestedFrequency);
    if (typeof ready.suggestedDay === 'number') setScheduleDays([ready.suggestedDay]);
  };

  const quickScheduleReminder = async (key: string) => {
    const ready = getPushReminderPreset(key);
    if (!ready) return;
    applyReminder(key);
    setScheduleBusy(true);
    setScheduleMsg(null);
    try {
      const frequency = ready.suggestedFrequency || 'daily';
      const timeOfDay = ready.suggestedTime || scheduleTime || '16:00';
      const res = await fetch('/api/admin/push/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({
          title: ready.title,
          body: ready.body,
          url: ready.url,
          imageUrl: imageUrl.trim() || null,
          audience: scheduleAudience,
          frequency,
          timeOfDay,
          dayOfWeek:
            frequency === 'weekly'
              ? (ready.suggestedDay ?? scheduleDays[0] ?? 1)
              : null,
          daysOfWeek:
            frequency === 'weekly'
              ? [ready.suggestedDay ?? scheduleDays[0] ?? 1]
              : null,
          timezone: 'Europe/London',
          enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save schedule');
      setScheduleMsg(
        `Saved ready reminder “${ready.label}” · ${frequency} at ${timeOfDay} UK → ${audienceLabel(
          scheduleAudience
        )}. Next: ${
          data.schedule?.next_run_at
            ? new Date(data.schedule.next_run_at).toLocaleString('en-GB', {
                timeZone: 'Europe/London',
              })
            : '—'
        }`
      );
      loadSchedules();
    } catch (err: unknown) {
      setScheduleMsg(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setScheduleBusy(false);
    }
  };

  useEffect(() => {
    if (audience !== 'user') return;
    const q = userQuery.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}&limit=20`, {
          headers: { 'x-admin-auth': 'true' },
        });
        const data = await res.json();
        if (cancelled) return;
        const rows = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
        setSearchHits(
          rows
            .map((u: { uid?: string; name?: string; email?: string }) => ({
              uid: String(u.uid || ''),
              name: String(u.name || 'Unknown'),
              email: String(u.email || ''),
            }))
            .filter((u: { uid: string }) => u.uid)
            .slice(0, 20)
        );
      } catch {
        if (!cancelled) setSearchHits([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [audience, userQuery]);

  const filteredRegistered = useMemo(() => {
    const list = info?.registeredUsers || [];
    const q = userQuery.trim().toLowerCase();
    if (!q) return list.slice(0, 30);
    return list
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.userId.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [info?.registeredUsers, userQuery]);

  const pickUser = (uid: string, label?: string) => {
    setUserId(uid);
    if (label) setUserQuery(label);
    setSearchHits([]);
  };

  const runDiagnose = async () => {
    setDiagnosing(true);
    setDiagnoseText(null);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (userId) params.set('userId', userId);
      if (wtnAppId.trim()) params.set('appId', wtnAppId.trim());
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/admin/push/diagnose${qs}`, {
        headers: { 'x-admin-auth': 'true' },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Diagnose failed');
        return;
      }
      const lines = [
        `Server App ID: ${data.serverAppId}`,
        `Website App ID: ${data.publicAppId}`,
        data.appIdMismatch ? 'WARNING: server App ID ≠ website App ID' : 'App IDs match',
        `Checked ${data.checked} token(s), valid on this app: ${data.validOnApp}`,
        data.hint,
        ...(data.tokens || []).map(
          (t: {
            tokenPreview: string;
            foundOnOneSignal: boolean;
            deviceLabel: string | null;
            invalidIdentifier: boolean | null;
            lookupError: string | null;
            platform: string;
          }) =>
            `• ${t.tokenPreview} [${t.platform}] → ${
              t.foundOnOneSignal
                ? t.invalidIdentifier
                  ? 'FOUND but INVALID push token'
                  : `OK (${t.deviceLabel || 'device'})`
                : t.lookupError || 'NOT on this OneSignal app'
            }`
        ),
      ];
      setDiagnoseText(lines.filter(Boolean).join('\n'));
    } catch {
      setError('Diagnose failed');
    } finally {
      setDiagnosing(false);
    }
  };

  const send = async () => {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      if (audience === 'user' && !userId.trim()) {
        setError('Select a user from the list or search results first.');
        setBusy(false);
        return;
      }

      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({
          preset: preset || undefined,
          title,
          body,
          url,
          imageUrl: imageUrl.trim() || undefined,
          audience,
          userId: audience === 'user' ? userId.trim() : undefined,
          appId: wtnAppId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Send failed');
        return;
      }
      const delivered = `Delivered to ${data.recipients ?? 0} device(s). ${
        data.strategy ? `via ${data.strategy}` : ''
      }${data.campaignId ? `\nCampaign: ${data.campaignId}` : ''}${data.note ? `\n${data.note}` : ''}`;
      const legacyWarn =
        data.legacyConfigured === false && (audience === 'all' || audience === 'onesignal')
          ? '\nWarning: legacy website app not configured — add ONESIGNAL_LEGACY_REST_API_KEY in Vercel to reach old web subscribers.'
          : '';
      setResult(`${delivered}${legacyWarn}`);
      // Refresh history
      fetch('/api/admin/push/send', { headers: { 'x-admin-auth': 'true' } })
        .then((res) => res.json())
        .then((status) => {
          if (!status?.error) setInfo(status as StatusInfo);
        })
        .catch(() => {});
      if (!data.recipients) {
        setError(
          data?.hint ||
            'API returned success but 0 devices received it. Check OneSignal has Subscribed Users, or set ONESIGNAL_LEGACY_REST_API_KEY for the old website app.'
        );
      }
    } catch {
      setError('Send failed');
    } finally {
      setBusy(false);
    }
  };

  const searchImages = async () => {
    const q = imageQuery.trim();
    if (q.length < 2) {
      setScheduleMsg('Type at least 2 characters to search images.');
      return;
    }
    setImageSearching(true);
    setScheduleMsg(null);
    try {
      const res = await fetch(`/api/admin/push/image-search?q=${encodeURIComponent(q)}`, {
        headers: { 'x-admin-auth': 'true' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Image search failed');
      setImageResults(Array.isArray(data.images) ? data.images : []);
      if (!data.images?.length) setScheduleMsg('No images found — try another search.');
    } catch (err: unknown) {
      setScheduleMsg(err instanceof Error ? err.message : 'Image search failed');
    } finally {
      setImageSearching(false);
    }
  };

  const uploadPushImage = async (file: File | null) => {
    if (!file) return;
    setImageUploading(true);
    setScheduleMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'push');
      const res = await fetch('/api/admin/vouchers/upload', {
        method: 'POST',
        headers: { 'x-admin-auth': 'true' },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      setImageUrl(String(data.url || ''));
      setScheduleMsg('Image uploaded and attached to this notification.');
    } catch (err: unknown) {
      setScheduleMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const beginEditSchedule = (row: PushScheduleRow) => {
    setEditingScheduleId(row.id);
    setTitle(row.title);
    setBody(row.body);
    setPreset('');
    setUrl(row.url || '/quiz');
    setScheduleUrl(row.url || '/quiz');
    setImageUrl(row.image_url || '');
    setScheduleAudience(
      row.audience === 'all' || row.audience === 'onesignal' ? row.audience : 'kids_zone'
    );
    setScheduleFrequency(row.frequency);
    setScheduleTime(String(row.time_of_day || '16:00').slice(0, 5));
    const days =
      Array.isArray(row.days_of_week) && row.days_of_week.length
        ? row.days_of_week
        : row.day_of_week != null
          ? [row.day_of_week]
          : [1];
    setScheduleDays(days);
    setScheduleMsg(`Editing schedule — change settings below, then Save changes.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearEditSchedule = () => {
    setEditingScheduleId(null);
    setScheduleMsg(null);
  };

  const toggleScheduleDay = (day: number) => {
    setScheduleDays((prev) => {
      if (prev.includes(day)) {
        const next = prev.filter((d) => d !== day);
        return next.length ? next : prev; // keep at least one selected
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const saveSchedule = async () => {
    if (!title.trim() || !body.trim()) {
      setScheduleMsg('Title and body are required to schedule.');
      return;
    }
    if (scheduleFrequency === 'weekly' && scheduleDays.length === 0) {
      setScheduleMsg('Select at least one day of the week.');
      return;
    }
    const openPath = scheduleUrl.trim() || '/';
    setScheduleBusy(true);
    setScheduleMsg(null);
    try {
      const payload = {
        title,
        body,
        url: openPath,
        imageUrl: imageUrl.trim() || null,
        audience: scheduleAudience,
        frequency: scheduleFrequency,
        timeOfDay: scheduleTime,
        dayOfWeek: scheduleFrequency === 'weekly' ? scheduleDays[0] : null,
        daysOfWeek: scheduleFrequency === 'weekly' ? scheduleDays : null,
        timezone: 'Europe/London',
        enabled: true,
      };

      const res = await fetch('/api/admin/push/schedules', {
        method: editingScheduleId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify(
          editingScheduleId ? { id: editingScheduleId, ...payload } : payload
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save schedule');
      const warning = data.warning ? `\n${data.warning}` : '';
      setScheduleMsg(
        `${editingScheduleId ? 'Updated' : 'Scheduled'} ${
          scheduleFrequency === 'weekly'
            ? scheduleDays
                .map((d) => WEEKDAY_OPTIONS.find((o) => o.value === d)?.short)
                .filter(Boolean)
                .join(', ')
            : 'every day'
        } at ${scheduleTime} UK → opens ${openPath} · ${audienceLabel(
          scheduleAudience
        )}${imageUrl.trim() ? ' · with image' : ''}. Next: ${
          data.schedule?.next_run_at
            ? new Date(data.schedule.next_run_at).toLocaleString('en-GB', {
                timeZone: 'Europe/London',
              })
            : '—'
        }${warning}`
      );
      setEditingScheduleId(null);
      loadSchedules();
    } catch (err: unknown) {
      setScheduleMsg(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setScheduleBusy(false);
    }
  };

  const toggleSchedule = async (row: PushScheduleRow) => {
    try {
      const res = await fetch('/api/admin/push/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({ id: row.id, enabled: !row.enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Update failed');
      loadSchedules();
    } catch (err: unknown) {
      setScheduleMsg(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const removeSchedule = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      const res = await fetch('/api/admin/push/schedules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      loadSchedules();
    } catch (err: unknown) {
      setScheduleMsg(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const runDueSchedules = async () => {
    setScheduleBusy(true);
    setScheduleMsg(null);
    try {
      const res = await fetch('/api/admin/push/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({ action: 'run_due' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Run due failed');
      const lines = (data.results || [])
        .map(
          (r: {
            title: string;
            ok: boolean;
            recipients: number;
            error?: string;
            skipped?: boolean;
          }) =>
            `${r.skipped ? '↷' : r.ok ? '✓' : '✗'} ${r.title}: ${
              r.skipped ? r.error || 'skipped' : `${r.recipients} devices`
            }${r.error && !r.skipped ? ` (${r.error})` : ''}`
        )
        .join('\n');
      setScheduleMsg(
        `Checked ${data.checked ?? 0} due · sent ${data.sent ?? 0} · skipped ${data.skipped ?? 0}${
          lines ? `\n${lines}` : ''
        }`
      );
      loadSchedules();
    } catch (err: unknown) {
      setScheduleMsg(err instanceof Error ? err.message : 'Run due failed');
    } finally {
      setScheduleBusy(false);
    }
  };

  const sendScheduleNow = async (row: PushScheduleRow) => {
    if (!confirm(`Send "${row.title}" now to ${audienceLabel(row.audience)}?`)) return;
    setScheduleBusy(true);
    setScheduleMsg(null);
    try {
      const res = await fetch('/api/admin/push/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({ action: 'send_now', id: row.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Send now failed');
      setScheduleMsg(`Sent "${row.title}" → ${data.recipients ?? 0} devices`);
      loadSchedules();
    } catch (err: unknown) {
      setScheduleMsg(err instanceof Error ? err.message : 'Send now failed');
    } finally {
      setScheduleBusy(false);
    }
  };

  const setScheduleOnesignal = async (row: PushScheduleRow) => {
    try {
      const res = await fetch('/api/admin/push/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({ id: row.id, audience: 'onesignal' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Update failed');
      setScheduleMsg(`"${row.title}" now targets the full OneSignal list`);
      loadSchedules();
    } catch (err: unknown) {
      setScheduleMsg(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Admin</p>
            <h1 className="text-2xl font-black text-slate-900">Push notifications</h1>
            <p className="mt-1 text-sm text-slate-600">Send OneSignal pushes to Kids Zone devices</p>
          </div>
          <Button type="button" onClick={() => router.push('/admin')} className="btn-secondary">
            Back
          </Button>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-violet-800">
            <Bell size={18} />
            <p className="text-sm font-semibold">
              {info
                ? info.configured
                  ? `${info.onesignalTokens} token(s) · ${info.registeredUsers?.length || 0} user(s)${
                      info.serverAppId ? ` · app ${info.serverAppId.slice(0, 8)}…` : ''
                    }${info.legacyConfigured ? ' · legacy web app ON' : ' · legacy web app OFF'}`
                  : 'Set ONESIGNAL_REST_API_KEY to enable sending'
                : 'Loading status…'}
            </p>
          </div>

          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <p className="font-semibold">All users = OneSignal subscribers + saved Kids Zone tokens</p>
            <p className="mt-1">
              Audience <strong>All OneSignal subscribers</strong> sends to OneSignal’s{' '}
              <strong>Subscribed Users</strong> and also to every saved device token / signed-in user ID in
              Kids Zone. Opens are tracked when someone taps the notification or lands with{' '}
              <code className="rounded bg-white px-1">?pushCampaign=</code>.
              {!info?.legacyConfigured && (
                <>
                  {' '}
                  Optional: set <code className="rounded bg-white px-1">ONESIGNAL_LEGACY_REST_API_KEY</code> for
                  the old website app (
                  <code className="rounded bg-white px-1">
                    {(info?.legacyAppId || 'daf8fc36').slice(0, 8)}…
                  </code>
                  ).
                </>
              )}
            </p>
            <label className="mt-2 block">
              <span className="font-bold uppercase tracking-wide">WTN OneSignal App ID (optional override)</span>
              <input
                value={wtnAppId}
                onChange={(e) => setWtnAppId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-xs text-slate-900"
              />
            </label>
            <button
              type="button"
              onClick={runDiagnose}
              disabled={diagnosing}
              className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              {diagnosing ? 'Checking tokens…' : 'Diagnose saved tokens'}
            </button>
            {diagnoseText && (
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white/80 p-2 text-[11px] leading-relaxed text-slate-800">
                {diagnoseText}
              </pre>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase text-slate-500">Ready reminders</span>
              <p className="mt-1 text-[11px] text-slate-500">
                Tap a ready message to fill title, body &amp; link. Or use Custom and type your own.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPreset('')}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                    preset === ''
                      ? 'border-violet-400 bg-violet-100 text-violet-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Custom
                </button>
                {PUSH_REMINDER_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyReminder(p.key)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                      preset === p.key
                        ? 'border-violet-400 bg-violet-100 text-violet-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Preset (list)</span>
              <select
                value={preset}
                onChange={(e) => {
                  const key = e.target.value;
                  if (key) applyReminder(key);
                  else setPreset('');
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {PRESET_OPTIONS.map((opt) => (
                  <option key={opt.key || 'custom'} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Title</span>
              <input
                value={title}
                onChange={(e) => {
                  setPreset('');
                  setTitle(e.target.value);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Body</span>
              <textarea
                value={body}
                onChange={(e) => {
                  setPreset('');
                  setBody(e.target.value);
                }}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">
                Open link path (page after tap)
              </span>
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setScheduleUrl(e.target.value);
                }}
                placeholder="/quiz"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {OPEN_PATH_PRESETS.map((p) => (
                  <button
                    key={p.path}
                    type="button"
                    onClick={() => {
                      setUrl(p.path);
                      setScheduleUrl(p.path);
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                      url === p.path
                        ? 'border-violet-400 bg-violet-100 text-violet-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Example: <code>/quiz</code> opens the quiz page when they tap the notification.
              </p>
            </label>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900">
                <ImagePlus size={16} />
                <p className="text-sm font-bold">Notification image</p>
              </div>
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">Image URL</span>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  {imageUploading ? 'Uploading…' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={imageUploading}
                    onChange={(e) => uploadPushImage(e.target.files?.[0] || null)}
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                  >
                    <X size={12} /> Clear
                  </button>
                )}
              </div>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Push preview"
                  className="h-28 w-full rounded-xl object-cover ring-1 ring-slate-200"
                />
              )}
              <div className="flex gap-2">
                <input
                  value={imageQuery}
                  onChange={(e) => setImageQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      searchImages();
                    }
                  }}
                  placeholder="Search free images…"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={imageSearching}
                  onClick={searchImages}
                  className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {imageSearching ? '…' : 'Search'}
                </button>
              </div>
              {!!imageResults.length && (
                <div className="grid grid-cols-4 gap-2">
                  {imageResults.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      title={img.title}
                      onClick={() => {
                        setImageUrl(img.url);
                        setScheduleMsg(`Attached image: ${img.title}`);
                      }}
                      className={`overflow-hidden rounded-lg ring-2 ${
                        imageUrl === img.url ? 'ring-emerald-500' : 'ring-transparent hover:ring-emerald-300'
                      }`}
                    >
                      <img src={img.thumbnail} alt={img.title} className="h-16 w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                Search uses free Creative Commons images. Shown on Android / iOS / web rich notifications.
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Audience</span>
              <select
                value={audience}
                onChange={(e) => {
                  setAudience(e.target.value as 'all' | 'user' | 'onesignal' | 'kids_zone');
                  setError(null);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="onesignal">Full OneSignal list (everyone subscribed)</option>
                <option value="all">Both (OneSignal + Kids Zone tokens)</option>
                <option value="kids_zone">Kids Zone push sign-ups only</option>
                <option value="user">Single user</option>
              </select>
            </label>

            {audience === 'user' && (
              <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                <div className="flex items-center gap-2 text-violet-900">
                  <UserRound size={16} />
                  <p className="text-sm font-bold">Choose who receives this push</p>
                </div>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-500">
                    Search by name, email, or paste uid
                  </span>
                  <div className="relative mt-1">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={userQuery}
                      onChange={(e) => {
                        setUserQuery(e.target.value);
                        // Allow pasting a raw uid directly
                        const raw = e.target.value.trim();
                        if (
                          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                            raw
                          )
                        ) {
                          setUserId(raw);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
                      placeholder="Type a name…"
                    />
                  </div>
                </label>

                {userId && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    Selected:{' '}
                    <strong>
                      {selectedRegistered?.name ||
                        searchHits.find((h) => h.uid === userId)?.name ||
                        'User'}
                    </strong>
                    <span className="mt-1 block font-mono text-xs opacity-80">{userId}</span>
                    <button
                      type="button"
                      className="mt-1 text-xs font-semibold underline"
                      onClick={() => {
                        setUserId('');
                        setUserQuery('');
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}

                {searching && <p className="text-xs text-slate-500">Searching users…</p>}

                {!!searchHits.length && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {searchHits.map((hit) => (
                      <button
                        key={hit.uid}
                        type="button"
                        onClick={() => pickUser(hit.uid, hit.name)}
                        className={`flex w-full flex-col items-start gap-0.5 border-b border-slate-100 px-3 py-2 text-left hover:bg-violet-50 ${
                          userId === hit.uid ? 'bg-violet-100' : ''
                        }`}
                      >
                        <span className="text-sm font-semibold text-slate-900">{hit.name}</span>
                        <span className="text-xs text-slate-500">{hit.email || hit.uid}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                    Users with a registered device
                  </p>
                  {!filteredRegistered.length ? (
                    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950">
                      <p className="font-semibold">No device tokens saved yet.</p>
                      <ol className="list-decimal space-y-1 pl-4">
                        <li>Open Kids Zone in the WTN mobile app (or browser) while signed in.</li>
                        <li>Allow notifications when prompted.</li>
                        <li>Or go to Profile → Enable push notifications.</li>
                        <li>Refresh this page — the user should appear here.</li>
                      </ol>
                      <p>
                        You can still search any user by name above and send via OneSignal external
                        ID (works if they have opened the app and OneSignal.login ran).
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      {filteredRegistered.map((u) => (
                        <button
                          key={u.userId}
                          type="button"
                          onClick={() => pickUser(u.userId, u.name)}
                          className={`flex w-full flex-col items-start gap-0.5 border-b border-slate-100 px-3 py-2 text-left hover:bg-violet-50 ${
                            userId === u.userId ? 'bg-violet-100' : ''
                          }`}
                        >
                          <span className="text-sm font-semibold text-slate-900">{u.name}</span>
                          <span className="text-xs text-slate-500">
                            {u.email || u.userId} · {u.platform}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={busy || !title.trim() || !body.trim() || (audience === 'user' && !userId)}
              onClick={send}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50"
            >
              <Send size={16} />
              {busy ? 'Sending…' : 'Send push'}
            </button>

            {result && (
              <p className="whitespace-pre-wrap text-sm font-medium text-emerald-700">{result}</p>
            )}
            {error && <p className="text-sm font-medium text-rose-700">{error}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-indigo-900">
            <CalendarClock size={18} />
            <h2 className="text-lg font-black">Schedule (daily / selected days)</h2>
          </div>
          <p className="mb-4 text-xs text-slate-600">
            Uses the title, body &amp; image above. Pick a <strong>ready reminder</strong>, then save
            a schedule — or tap <strong>Quick schedule</strong> below to add different reminders in
            one go. Times are <strong>Europe/London</strong>.
          </p>

          <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <p className="text-xs font-bold uppercase text-indigo-800">Quick schedule ready reminders</p>
            <p className="mt-1 text-[11px] text-indigo-900/80">
              Adds a separate schedule for each message (suggested UK time). Audience:{' '}
              {audienceLabel(scheduleAudience)}.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PUSH_REMINDER_PRESETS.map((p) => (
                <button
                  key={`qs-${p.key}`}
                  type="button"
                  disabled={scheduleBusy}
                  onClick={() => quickScheduleReminder(p.key)}
                  className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-bold text-indigo-900 hover:bg-indigo-100 disabled:opacity-50"
                  title={`${p.title} · ${p.suggestedFrequency || 'daily'} ${p.suggestedTime || ''}`}
                >
                  + {p.label}
                  {p.suggestedTime ? (
                    <span className="ml-1 font-medium text-indigo-500">{p.suggestedTime}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {editingScheduleId && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <span>Editing existing schedule — change fields above/below, then save.</span>
              <button type="button" onClick={clearEditSchedule} className="font-bold underline">
                Cancel edit
              </button>
            </div>
          )}

          <label className="mb-3 block">
            <span className="text-xs font-bold uppercase text-slate-500">
              Open link path for this schedule
            </span>
            <input
              value={scheduleUrl}
              onChange={(e) => setScheduleUrl(e.target.value)}
              placeholder="/quiz"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {OPEN_PATH_PRESETS.map((p) => (
                <button
                  key={`sched-${p.path}`}
                  type="button"
                  onClick={() => setScheduleUrl(p.path)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                    scheduleUrl === p.path
                      ? 'border-indigo-400 bg-indigo-100 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </label>

          <label className="mb-4 block">
            <span className="text-xs font-bold uppercase text-slate-500">Send to</span>
            <select
              value={scheduleAudience}
              onChange={(e) =>
                setScheduleAudience(e.target.value as 'onesignal' | 'kids_zone' | 'all')
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="onesignal">Full OneSignal list</option>
              <option value="all">Both lists</option>
              <option value="kids_zone">Kids Zone push sign-ups only</option>
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Frequency</span>
              <select
                value={scheduleFrequency}
                onChange={(e) => {
                  const next = e.target.value as 'daily' | 'weekly';
                  setScheduleFrequency(next);
                  if (next === 'weekly' && scheduleDays.length === 0) setScheduleDays([1]);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="daily">Every day</option>
                <option value="weekly">Selected days</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Time (UK)</span>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {scheduleFrequency === 'weekly' ? (
            <div className="mt-3">
              <span className="text-xs font-bold uppercase text-slate-500">Days of the week</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((d) => {
                  const on = scheduleDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleScheduleDay(d.value)}
                      className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                        on
                          ? 'bg-indigo-700 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                      }`}
                      aria-pressed={on}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Tap days to include — e.g. Mon, Wed, Fri.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Runs every day at the time above.</p>
          )}

          <p className="mt-2 text-xs text-slate-500">
            Times are UK (Europe/London). In production, due schedules are checked every hour.
            Locally use <strong>Run due now</strong> or <strong>Send now</strong> to deliver.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={scheduleBusy || !title.trim() || !body.trim()}
              onClick={saveSchedule}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-50"
            >
              <CalendarClock size={16} />
              {scheduleBusy
                ? 'Saving…'
                : editingScheduleId
                  ? 'Save changes'
                  : 'Save schedule'}
            </button>
            <button
              type="button"
              disabled={scheduleBusy}
              onClick={runDueSchedules}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-900 hover:bg-indigo-100 disabled:opacity-50"
            >
              Run due now
            </button>
          </div>

          {scheduleMsg && (
            <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-indigo-800">{scheduleMsg}</p>
          )}
          {scheduleHint && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {scheduleHint}
            </p>
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2">Schedule</th>
                  <th className="py-2 pr-2">Next run</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No schedules yet — run SETUP_PUSH_SCHEDULES.sql then save one above
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <div className="font-semibold text-slate-900">{s.title}</div>
                        <div className="text-xs text-slate-500">
                          {scheduleDaysLabel(s)} at {s.time_of_day} · opens{' '}
                          <code className="rounded bg-slate-100 px-1">{s.url || '/'}</code>
                          <br />
                          {audienceLabel(s.audience)}
                          {s.image_url ? ' · has image' : ''}
                        </div>
                        {s.image_url && (
                          <img
                            src={s.image_url}
                            alt=""
                            className="mt-1 h-10 w-16 rounded object-cover ring-1 ring-slate-200"
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2 text-xs text-slate-600 whitespace-nowrap">
                        {s.next_run_at
                          ? new Date(s.next_run_at).toLocaleString('en-GB', {
                              timeZone: s.timezone || 'Europe/London',
                            })
                          : '—'}
                        {s.last_sent_at && (
                          <div className="mt-1 text-[11px] text-slate-400">
                            Last:{' '}
                            {new Date(s.last_sent_at).toLocaleString('en-GB', {
                              timeZone: s.timezone || 'Europe/London',
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            s.enabled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.enabled ? 'On' : 'Off'}
                        </span>
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                        <button
                          type="button"
                          onClick={() => beginEditSchedule(s)}
                          className="text-xs font-bold text-slate-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={scheduleBusy}
                          onClick={() => sendScheduleNow(s)}
                          className="text-xs font-bold text-emerald-700 hover:underline disabled:opacity-50"
                        >
                          Send now
                        </button>
                        {(s.audience === 'kids_zone' || s.audience === 'tokens') && (
                          <button
                            type="button"
                            onClick={() => setScheduleOnesignal(s)}
                            className="text-xs font-bold text-violet-700 hover:underline"
                          >
                            Use Full OneSignal
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleSchedule(s)}
                          className="text-xs font-bold text-indigo-700 hover:underline"
                        >
                          {s.enabled ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSchedule(s.id)}
                          className="text-xs font-bold text-rose-700 hover:underline"
                        >
                          Delete
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Sent history</h2>
          <p className="mt-1 text-xs text-slate-500">
            Recipients = OneSignal delivery count · Opens = taps / landing reads
          </p>
          {info?.setupHint && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {info.setupHint}
            </p>
          )}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Audience</th>
                  <th className="py-2 pr-3">Sent</th>
                  <th className="py-2">Opened</th>
                </tr>
              </thead>
              <tbody>
                {(info?.campaigns || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No campaigns yet — send a push after running SETUP_PUSH_CAMPAIGN_TRACKING.sql
                    </td>
                  </tr>
                ) : (
                  (info?.campaigns || []).map((c) => (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 text-xs text-slate-500 whitespace-nowrap">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-semibold text-slate-900">{c.title}</div>
                        <div className="max-w-[220px] truncate text-xs text-slate-500">{c.body}</div>
                      </td>
                      <td className="py-2 pr-3 text-xs">{c.audience}</td>
                      <td className="py-2 pr-3 font-bold text-violet-800">{c.recipients}</td>
                      <td className="py-2 font-bold text-emerald-700">{c.opens}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
