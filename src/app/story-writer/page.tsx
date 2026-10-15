'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';
import {
  PRIZE_RANK_LABELS,
  PRIZE_STATUS_LABELS,
  STORY_BADGES,
  STORY_CATEGORIES,
  STORY_LIMITS,
  STORY_STATUS_LABELS,
  categoryLabel,
  wordCount,
  type LeaderboardPeriod,
  type PrizeStatus,
  type StoryStatus,
} from '@/lib/story-writing';

type Story = {
  id: string;
  title: string;
  content: string;
  islamicLesson: string;
  category: string | null;
  illustrationUrl: string | null;
  challengeId: string | null;
  status: StoryStatus;
  adminNotes: string | null;
  pointsAwarded: number;
  updatedAt: string;
  author?: string;
};
type Challenge = { id: string; title: string; description: string; endDate: string; bonusPoints: number };
type Entry = {
  rank: number;
  displayName: string;
  storyPoints: number;
  storiesApproved: number;
  totalPoints: number;
  isMe?: boolean;
};
type Board = { entries: Entry[]; me: Entry | null; totalWriters: number };
type Results = {
  monthKey: string;
  status: string;
  top10: Entry[];
  prizes: { id: string; rank: number; title: string; description: string; status: PrizeStatus; isMine: boolean }[];
};
type Me = {
  storyPoints: number;
  storyPointsThisMonth: number;
  storiesApproved: number;
  totalKidsZonePoints: number;
  badges: { key: string; awardedAt: string }[];
  notifications: { id: string; title: string; body: string; read_at: string | null; created_at: string }[];
  unreadCount: number;
};

const TABS = [
  { id: 'write', label: 'Write a Story', icon: '✍️' },
  { id: 'challenges', label: 'Story Challenges', icon: '🎯' },
  { id: 'mine', label: 'My Stories', icon: '📓' },
  { id: 'approved', label: 'Approved Stories', icon: '🌟' },
  { id: 'points', label: 'My Points', icon: '⭐' },
  { id: 'competition', label: 'Monthly Competition', icon: '🏆' },
  { id: 'prizes', label: 'Prizes', icon: '🎁' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
];

const STATUS_STYLE: Record<StoryStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  CHANGES_REQUESTED: 'bg-orange-100 text-orange-800',
};

const EMPTY = { id: '', title: '', content: '', islamicLesson: '', category: '', challengeId: '' };

const card = 'rounded-3xl bg-white p-5 shadow-md border border-emerald-100';
const bigBtn =
  'min-h-12 rounded-2xl px-5 py-3 text-base font-extrabold transition active:scale-95 disabled:opacity-50';

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await authJsonFetch(url, { cache: 'no-store' });
    const json = await res.json();
    return res.ok ? (json as T) : null;
  } catch {
    return null;
  }
}

export default function StoryWriterPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<TabId>('write');
  const [form, setForm] = useState(EMPTY);
  const [stories, setStories] = useState<Story[]>([]);
  const [approved, setApproved] = useState<Story[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [period, setPeriod] = useState<LeaderboardPeriod>('month');
  const [board, setBoard] = useState<Board | null>(null);
  const [competition, setCompetition] = useState<{ current: Results; previous: Results | null } | null>(null);
  const [illustration, setIllustration] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupMissing, setSetupMissing] = useState(false);
  const [openStory, setOpenStory] = useState<Story | null>(null);

  const words = useMemo(() => wordCount(form.content), [form.content]);
  const locked = useMemo(() => {
    const current = stories.find((s) => s.id === form.id);
    return current ? !['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(current.status) : false;
  }, [stories, form.id]);

  const loadMine = useCallback(async () => {
    const res = await authJsonFetch('/api/story-writing/stories', { cache: 'no-store' }).catch(() => null);
    if (!res) return;
    if (res.status === 503) setSetupMissing(true);
    const json = await res.json().catch(() => null);
    if (res.ok && json) setStories(json.stories);
  }, []);

  const loadMe = useCallback(async () => setMe(await getJson<Me>('/api/story-writing/me')), []);

  useEffect(() => {
    if (!user) return;
    void loadMine();
    void loadMe();
    void getJson<{ challenges: Challenge[] }>('/api/story-writing/challenges').then((r) => setChallenges(r?.challenges ?? []));
  }, [user, loadMine, loadMe]);

  useEffect(() => {
    if (!user) return;
    if (tab === 'approved') void getJson<{ stories: Story[] }>('/api/story-writing/approved').then((r) => setApproved(r?.stories ?? []));
    if (tab === 'competition' || tab === 'prizes') void getJson<{ current: Results; previous: Results | null }>('/api/story-writing/competition').then(setCompetition);
  }, [user, tab]);

  useEffect(() => {
    if (!user || (tab !== 'competition' && tab !== 'points')) return;
    void getJson<Board>(`/api/story-writing/leaderboard?period=${period}`).then(setBoard);
  }, [user, tab, period]);

  const flash = (kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (action: 'save' | 'submit') => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await authJsonFetch('/api/story-writing/stories', {
        method: 'POST',
        body: JSON.stringify({ ...form, id: form.id || undefined, category: form.category || null, challengeId: form.challengeId || null, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        flash('error', json.error || 'Something went wrong.');
        return;
      }
      flash('ok', json.message);
      if (action === 'submit') {
        setForm(EMPTY);
        setIllustration(null);
      } else {
        setForm((f) => ({ ...f, id: json.story.id }));
      }
      await loadMine();
    } finally {
      setBusy(false);
    }
  };

  const uploadPicture = async (file: File | undefined) => {
    if (!file) return;
    let id = form.id;
    if (!id) {
      const res = await authJsonFetch('/api/story-writing/stories', {
        method: 'POST',
        body: JSON.stringify({ ...form, category: form.category || null, challengeId: form.challengeId || null, action: 'save' }),
      });
      const json = await res.json();
      if (!res.ok) return flash('error', json.error || 'Please add a title first, then add your picture.');
      id = json.story.id as string;
      setForm((f) => ({ ...f, id }));
    }
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`/api/story-writing/stories/${id}/illustration`, {
      method: 'POST',
      headers: await getAuthFetchHeaders(),
      body,
    });
    const json = await res.json();
    if (!res.ok) return flash('error', json.error || 'Upload failed.');
    setIllustration(json.illustrationUrl);
    void loadMine();
  };

  const removePicture = async () => {
    if (!form.id) return;
    await authJsonFetch(`/api/story-writing/stories/${form.id}/illustration`, { method: 'DELETE' });
    setIllustration(null);
    void loadMine();
  };

  const edit = (story: Story) => {
    setForm({
      id: story.id,
      title: story.title,
      content: story.content,
      islamicLesson: story.islamicLesson,
      category: story.category ?? '',
      challengeId: story.challengeId ?? '',
    });
    setIllustration(story.illustrationUrl);
    setNotice(null);
    setTab('write');
  };

  const deleteDraft = async (id: string) => {
    if (!window.confirm('Delete this draft?')) return;
    await authJsonFetch(`/api/story-writing/stories/${id}`, { method: 'DELETE' });
    if (form.id === id) {
      setForm(EMPTY);
      setIllustration(null);
    }
    void loadMine();
  };

  const markRead = async () => {
    await authJsonFetch('/api/story-writing/me', { method: 'POST' });
    void loadMe();
  };

  if (loading) return <main className="p-8 text-center text-lg">Loading…</main>;
  if (!user) {
    return (
      <main className="mx-auto max-w-xl p-6 text-center">
        <div className={card}>
          <div className="text-5xl">✍️</div>
          <h1 className="mt-2 text-2xl font-black text-emerald-800">Islamic Story Writer</h1>
          <p className="mt-2 text-slate-600">Please sign in to write your own Islamic stories and earn points.</p>
          <Link href="/signin" className={`${bigBtn} mt-4 inline-block bg-emerald-600 text-white`}>
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const input = 'w-full rounded-2xl border-2 border-emerald-200 bg-white px-4 py-3 text-base focus:border-emerald-500 focus:outline-none';

  return (
    <main className="mx-auto max-w-5xl px-3 py-5 sm:px-6">
      <header className="mb-4 rounded-3xl bg-gradient-to-r from-emerald-500 to-sky-500 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">✍️ Islamic Story Writer</h1>
            <p className="text-sm opacity-90">Write stories with a beautiful lesson. Earn points when an admin approves them!</p>
          </div>
          {me && (
            <div className="rounded-2xl bg-white/20 px-3 py-2 text-center">
              <div className="text-xl font-black">{me.storyPoints}</div>
              <div className="text-xs">story points</div>
            </div>
          )}
        </div>
      </header>

      {setupMissing && (
        <p className="mb-3 rounded-2xl bg-amber-100 p-3 text-amber-900">This feature is being set up. Please check back soon!</p>
      )}
      {notice && (
        <p role="status" className={`mb-3 rounded-2xl p-3 font-semibold ${notice.kind === 'ok' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}>
          {notice.text}
        </p>
      )}

      <nav aria-label="Story writer sections" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`${bigBtn} flex flex-col items-center gap-1 !px-2 !py-2 text-sm ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-800 border border-emerald-200'}`}
          >
            <span className="text-xl">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'write' && (
        <section className={card}>
          <h2 className="mb-3 text-xl font-black text-emerald-800">{form.id ? 'Edit your story' : 'Write a new story'}</h2>
          {locked ? (
            <p className="rounded-2xl bg-amber-50 p-3">This story is waiting for review, so it can&apos;t be changed right now.</p>
          ) : null}
          <div className="grid gap-4">
            <label className="grid gap-1 font-bold">
              Story title
              <input className={input} value={form.title} maxLength={STORY_LIMITS.titleMax} disabled={locked} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. The Honest Shepherd" />
            </label>
            <label className="grid gap-1 font-bold">
              Category (optional)
              <select className={input} value={form.category} disabled={locked} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Choose a category</option>
                {STORY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </label>
            {challenges.length > 0 && (
              <label className="grid gap-1 font-bold">
                Story challenge (optional)
                <select className={input} value={form.challengeId} disabled={locked} onChange={(e) => setForm({ ...form, challengeId: e.target.value })}>
                  <option value="">Not part of a challenge</option>
                  {challenges.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1 font-bold">
              Your story
              <textarea className={`${input} min-h-56 leading-relaxed`} value={form.content} maxLength={STORY_LIMITS.contentMax} disabled={locked} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Once upon a time…" />
              <span className="text-sm font-normal text-slate-500">
                {words} words · {form.content.length}/{STORY_LIMITS.contentMax} characters (at least {STORY_LIMITS.contentMin} to submit)
              </span>
            </label>
            <label className="grid gap-1 font-bold">
              💡 Islamic lesson / message
              <textarea className={`${input} min-h-24`} value={form.islamicLesson} maxLength={STORY_LIMITS.lessonMax} disabled={locked} onChange={(e) => setForm({ ...form, islamicLesson: e.target.value })} placeholder="What does your story teach us?" />
            </label>
            <div className="grid gap-2 font-bold">
              🖼️ Illustration (optional)
              {illustration && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={illustration} alt="Your illustration" className="max-h-64 rounded-2xl object-contain" />
              )}
              <div className="flex flex-wrap gap-2">
                <label className={`${bigBtn} cursor-pointer bg-sky-100 text-sky-800`}>
                  {illustration ? 'Change picture' : 'Add a picture'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={locked} onChange={(e) => { void uploadPicture(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {illustration && !locked && (
                  <button type="button" className={`${bigBtn} bg-slate-100`} onClick={removePicture}>Remove</button>
                )}
              </div>
              <span className="text-xs font-normal text-slate-500">JPG, PNG or WebP, up to 4 MB. Please don&apos;t include faces or names.</span>
            </div>
            <p className="rounded-2xl bg-sky-50 p-3 text-sm text-sky-900">
              🔒 Please don&apos;t write phone numbers, addresses, your school or your full name. Your story stays private until an admin approves it.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={busy || locked} onClick={() => save('save')} className={`${bigBtn} bg-slate-200 text-slate-800`}>💾 Save Draft</button>
              <button type="button" disabled={busy || locked} onClick={() => save('submit')} className={`${bigBtn} bg-emerald-600 text-white`}>🚀 Submit for Review</button>
              {form.id && (
                <button type="button" onClick={() => { setForm(EMPTY); setIllustration(null); }} className={`${bigBtn} bg-white text-slate-600 border`}>New story</button>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === 'challenges' && (
        <section className="grid gap-3">
          {challenges.length === 0 && <p className={card}>No challenges right now. Check back soon, or write any story you like!</p>}
          {challenges.map((c) => (
            <article key={c.id} className={card}>
              <h2 className="text-lg font-black text-emerald-800">🎯 {c.title}</h2>
              <p className="mt-1 text-slate-700">{c.description}</p>
              <p className="mt-2 text-sm text-slate-500">Ends {c.endDate}{c.bonusPoints > 0 ? ` · Bonus up to +${c.bonusPoints} points` : ''}</p>
              <button type="button" className={`${bigBtn} mt-3 bg-emerald-600 text-white`} onClick={() => { setForm({ ...EMPTY, challengeId: c.id, title: '' }); setIllustration(null); setTab('write'); }}>
                Write this story
              </button>
            </article>
          ))}
        </section>
      )}

      {tab === 'mine' && (
        <section className="grid gap-3">
          {stories.length === 0 && <p className={card}>You haven&apos;t written any stories yet. Start with “Write a Story”!</p>}
          {stories.map((s) => (
            <article key={s.id} className={card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black">{s.title || 'Untitled'}</h2>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${STATUS_STYLE[s.status]}`}>{STORY_STATUS_LABELS[s.status]}</span>
              </div>
              <p className="text-sm text-slate-500">{categoryLabel(s.category)}</p>
              {s.status === 'APPROVED' && <p className="mt-1 font-bold text-emerald-700">⭐ {s.pointsAwarded} points earned</p>}
              {s.adminNotes && s.status !== 'APPROVED' && (
                <p className="mt-2 rounded-2xl bg-orange-50 p-3 text-orange-900"><strong>Feedback:</strong> {s.adminNotes}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={`${bigBtn} bg-slate-100`} onClick={() => setOpenStory(s)}>Read</button>
                {['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(s.status) && (
                  <button type="button" className={`${bigBtn} bg-emerald-600 text-white`} onClick={() => edit(s)}>Edit</button>
                )}
                {s.status === 'DRAFT' && (
                  <button type="button" className={`${bigBtn} bg-rose-50 text-rose-700`} onClick={() => deleteDraft(s.id)}>Delete</button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'approved' && (
        <section className="grid gap-3">
          {approved.length === 0 && <p className={card}>No approved stories yet. Yours could be the first!</p>}
          {approved.map((s) => (
            <article key={s.id} className={card}>
              <h2 className="text-lg font-black text-emerald-800">{s.title}</h2>
              <p className="text-sm text-slate-500">by {s.author} · {categoryLabel(s.category)}</p>
              <button type="button" className={`${bigBtn} mt-2 bg-sky-100 text-sky-800`} onClick={() => setOpenStory(s)}>Read story</button>
            </article>
          ))}
        </section>
      )}

      {tab === 'points' && (
        <section className="grid gap-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className={card}><div className="text-2xl font-black text-emerald-700">{me?.storyPoints ?? 0}</div><div className="text-xs">Story points</div></div>
            <div className={card}><div className="text-2xl font-black text-sky-700">{me?.storiesApproved ?? 0}</div><div className="text-xs">Stories approved</div></div>
            <div className={card}><div className="text-2xl font-black text-amber-600">{me?.totalKidsZonePoints ?? 0}</div><div className="text-xs">Total Kids Zone points</div></div>
          </div>
          <div className={card}>
            <h2 className="mb-2 text-lg font-black">🏅 My badges</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STORY_BADGES.map((b) => {
                const got = me?.badges.some((x) => x.key === b.key);
                return (
                  <div key={b.key} title={b.description} className={`rounded-2xl p-3 text-center ${got ? 'bg-amber-100' : 'bg-slate-100 opacity-60'}`}>
                    <div className="text-3xl">{b.icon}</div>
                    <div className="text-sm font-bold">{b.label}</div>
                    <div className="text-xs">{got ? 'Earned!' : 'Locked'}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={card}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-black">🔔 Notifications {me && me.unreadCount > 0 ? `(${me.unreadCount} new)` : ''}</h2>
              {me && me.unreadCount > 0 && <button type="button" className="text-sm font-bold text-emerald-700 underline" onClick={markRead}>Mark all read</button>}
            </div>
            {(me?.notifications.length ?? 0) === 0 && <p className="text-slate-500">Nothing yet.</p>}
            <ul className="grid gap-2">
              {me?.notifications.map((n) => (
                <li key={n.id} className={`whitespace-pre-line rounded-2xl p-3 ${n.read_at ? 'bg-slate-50' : 'bg-emerald-50 font-semibold'}`}>
                  {n.body}
                  <div className="text-xs font-normal text-slate-500">{new Date(n.created_at).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === 'competition' && (
        <section className="grid gap-4">
          {competition?.previous && <Podium results={competition.previous} title="Last month's winners" />}
          <div className={card}>
            <h2 className="mb-2 text-lg font-black">🏆 Story Writing leaderboard</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <button key={p.id} type="button" onClick={() => setPeriod(p.id)} className={`${bigBtn} !py-2 text-sm ${period === p.id ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>{p.label}</button>
              ))}
            </div>
            {board?.me && (
              <p className="mb-3 rounded-2xl bg-amber-100 p-3 font-bold">Your position: #{board.me.rank} · {board.me.storyPoints} story points</p>
            )}
            {board && !board.me && <p className="mb-3 text-sm text-slate-500">You&apos;re not on this leaderboard yet. Get a story approved!</p>}
            <Table entries={board?.entries ?? []} />
          </div>
          {competition?.current && <Podium results={competition.current} title="This month so far" />}
        </section>
      )}

      {tab === 'prizes' && (
        <section className={card}>
          <h2 className="mb-2 text-lg font-black">🎁 Monthly prizes</h2>
          {(competition?.current.prizes.length ?? 0) === 0 && <p className="text-slate-500">Prizes will be announced soon.</p>}
          <ul className="grid gap-2">
            {competition?.current.prizes.map((p) => (
              <li key={p.id} className="rounded-2xl bg-emerald-50 p-3">
                <strong>{PRIZE_RANK_LABELS[p.rank]}</strong>: {p.title}
                {p.description && <div className="text-sm text-slate-600">{p.description}</div>}
              </li>
            ))}
          </ul>
          {competition?.previous?.prizes.filter((p) => p.isMine).map((p) => (
            <p key={p.id} className="mt-3 rounded-2xl bg-amber-100 p-3 font-bold">🎉 You won {p.title}! Status: {PRIZE_STATUS_LABELS[p.status]}</p>
          ))}
        </section>
      )}

      {openStory && (
        <div role="dialog" aria-modal="true" aria-label={openStory.title} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setOpenStory(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-emerald-800">{openStory.title}</h2>
            {openStory.author && <p className="text-sm text-slate-500">by {openStory.author}</p>}
            {openStory.illustrationUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={openStory.illustrationUrl} alt="Story illustration" className="my-3 max-h-72 rounded-2xl object-contain" />
            )}
            <p className="my-3 whitespace-pre-wrap leading-relaxed">{openStory.content}</p>
            <p className="rounded-2xl bg-emerald-50 p-3"><strong>💡 Lesson:</strong> {openStory.islamicLesson}</p>
            <button type="button" className={`${bigBtn} mt-4 w-full bg-emerald-600 text-white`} onClick={() => setOpenStory(null)}>Close</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Table({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return <p className="text-slate-500">No writers on the board yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm sm:text-base">
        <thead>
          <tr className="text-slate-500">
            <th className="p-2">Rank</th><th className="p-2">Writer</th><th className="p-2">Story pts</th><th className="p-2">Approved</th><th className="p-2">Total pts</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={`${e.rank}-${e.displayName}`} className={e.isMe ? 'bg-amber-50 font-bold' : ''}>
              <td className="p-2">{e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : `#${e.rank}`}</td>
              <td className="p-2">{e.displayName}{e.isMe ? ' (you)' : ''}</td>
              <td className="p-2">{e.storyPoints}</td>
              <td className="p-2">{e.storiesApproved}</td>
              <td className="p-2">{e.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Podium({ results, title }: { results: Results; title: string }) {
  const [first, second, third] = results.top10;
  const final = results.status === 'FINALIZED';
  return (
    <div className={card}>
      <h2 className="mb-2 text-lg font-black">{title} ({results.monthKey})</h2>
      {first ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-amber-100 p-3 text-center"><div className="text-3xl">🏆</div><div className="text-xs">{final ? 'Story Writing Champion' : 'Leading'}</div><strong>{first.displayName}</strong><div className="text-sm">{first.storyPoints} pts</div></div>
          {second && <div className="rounded-2xl bg-slate-100 p-3 text-center"><div className="text-3xl">🥈</div><div className="text-xs">Runner Up</div><strong>{second.displayName}</strong><div className="text-sm">{second.storyPoints} pts</div></div>}
          {third && <div className="rounded-2xl bg-orange-100 p-3 text-center"><div className="text-3xl">🥉</div><div className="text-xs">Third Place</div><strong>{third.displayName}</strong><div className="text-sm">{third.storyPoints} pts</div></div>}
        </div>
      ) : (
        <p className="text-slate-500">No approved stories yet this month.</p>
      )}
      {results.top10.length > 0 && (
        <>
          <h3 className="mb-1 mt-4 font-black">Top 10 Story Writers</h3>
          <Table entries={results.top10} />
        </>
      )}
    </div>
  );
}
