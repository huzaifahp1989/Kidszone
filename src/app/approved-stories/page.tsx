'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Headphones, RefreshCw, Search, ShieldCheck, Sparkles } from 'lucide-react';
import AudioPlayer from '@/components/AudioPlayer';
import { categoryLabel } from '@/lib/story-writing';

type Narration = {
  id: string;
  title: string;
  author: string;
  storyId: string | null;
  storyTitle: string | null;
  storySummary: string | null;
  categoryEmoji: string;
  categoryLabel: string;
  durationSeconds: number;
  approvedAt: string | null;
  audioUrl: string | null;
};

type WrittenStory = {
  id: string;
  title: string;
  content: string;
  islamicLesson: string;
  category: string | null;
  illustrationUrl: string | null;
  ageGroup: string | null;
  author: string;
  approvedAt: string | null;
};

type StoryGroup = {
  storyId: string | null;
  title: string;
  summary: string | null;
  narrations: Narration[];
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StoryGalleryPage() {
  const [narrations, setNarrations] = useState<Narration[]>([]);
  const [writtenStories, setWrittenStories] = useState<WrittenStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'listen' | 'read'>('listen');
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [recordingsResponse, storiesResponse] = await Promise.all([
        fetch('/api/approved-recordings', { cache: 'no-store' }),
        fetch('/api/story-writing/approved', { cache: 'no-store' }),
      ]);

      if (recordingsResponse.ok) {
        const payload = await recordingsResponse.json();
        const rows: Narration[] = Array.isArray(payload.recordings) ? payload.recordings : [];
        setNarrations(rows.filter((row) => row.audioUrl && row.storyId));
      }

      if (storiesResponse.ok) {
        const payload = await storiesResponse.json();
        setWrittenStories(Array.isArray(payload.stories) ? payload.stories : []);
      }

      if (!recordingsResponse.ok && !storiesResponse.ok) {
        throw new Error('Could not load the story gallery.');
      }
      setError(null);
    } catch (fetchError) {
      console.error('Error loading story gallery:', fetchError);
      setError('The story gallery could not be loaded right now. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo<StoryGroup[]>(() => {
    const term = search.trim().toLowerCase();
    const byStory = new Map<string, StoryGroup>();

    for (const narration of narrations) {
      const key = narration.storyId || narration.storyTitle || 'other';
      if (term) {
        const haystack = [narration.storyTitle ?? '', narration.author, narration.title].join(' ').toLowerCase();
        if (!haystack.includes(term)) continue;
      }
      const existing = byStory.get(key);
      if (existing) {
        existing.narrations.push(narration);
      } else {
        byStory.set(key, {
          storyId: narration.storyId,
          title: narration.storyTitle || narration.title,
          summary: narration.storySummary,
          narrations: [narration],
        });
      }
    }

    return Array.from(byStory.values());
  }, [narrations, search]);

  const visibleStories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return writtenStories;
    return writtenStories.filter((story) =>
      [story.title, story.author, categoryLabel(story.category)].join(' ').toLowerCase().includes(term)
    );
  }, [search, writtenStories]);

  return (
    <div className="min-h-screen bg-islamic-light py-8 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700">
                <Sparkles size={13} aria-hidden /> Story Gallery
              </span>
              <h1 className="mt-2 text-3xl font-black text-gray-900">Stories &amp; Recordings</h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-600">
                Read stories written by our young learners, and listen to approved recordings for each child.
              </p>
            </div>

            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} aria-hidden /> Refresh
            </button>
          </div>

          <div className="mt-5 space-y-3">
            <label className="relative block">
              <span className="sr-only">Search the story gallery</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search stories or narrators…"
                className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-800 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTab('listen')}
                aria-pressed={tab === 'listen'}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                  tab === 'listen'
                    ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200 hover:bg-teal-50'
                }`}
              >
                <Headphones size={15} aria-hidden /> Listen ({groups.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('read')}
                aria-pressed={tab === 'read'}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                  tab === 'read'
                    ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200 hover:bg-teal-50'
                }`}
              >
                <BookOpen size={15} aria-hidden /> Read ({writtenStories.length})
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-islamic-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-semibold text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => load(true)}
              className="mt-3 rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white transition hover:brightness-110"
            >
              Try again
            </button>
          </div>
        ) : tab === 'listen' ? (
          groups.length === 0 ? (
            <EmptyState
              title="No published story narrations yet"
              body="Recordings show up here once a teacher approves them and marks them to be published."
              href="/stories"
              linkLabel="Browse stories"
            />
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <section key={group.storyId || group.title} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-black text-gray-900">{group.title}</h2>
                      {group.summary && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{group.summary}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                        {group.narrations.length} {group.narrations.length === 1 ? 'recording' : 'recordings'}
                      </span>
                      {group.storyId && (
                        <Link
                          href={`/stories/${group.storyId}`}
                          className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-bold text-teal-700 transition hover:bg-teal-50"
                        >
                          Read story
                        </Link>
                      )}
                    </div>
                  </div>

                  <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {group.narrations.map((narration) => (
                      <li key={narration.id}>
                        <AudioPlayer
                          src={narration.audioUrl}
                          title={narration.author}
                          subtitle={`${narration.categoryEmoji} ${narration.categoryLabel}${
                            narration.approvedAt ? ` · approved ${formatDate(narration.approvedAt)}` : ''
                          }`}
                          ariaLabel={`Play ${group.title} by ${narration.author}`}
                          durationHint={narration.durationSeconds}
                          downloadFilename={`${group.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${narration.author
                            .replace(/[^a-z0-9]+/gi, '-')
                            .toLowerCase()}.webm`}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )
        ) : visibleStories.length === 0 ? (
          <EmptyState
            title="No approved stories yet"
            body="Stories written by our learners appear here after a teacher approves them."
            href="/story-writer"
            linkLabel="Write a story"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleStories.map((story) => (
              <article key={story.id} className="flex flex-col rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-gray-900">{story.title}</h2>
                    <p className="mt-0.5 text-xs font-semibold text-gray-500">
                      by {story.author}
                      {story.approvedAt ? ` · ${formatDate(story.approvedAt)}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
                    {categoryLabel(story.category)}
                  </span>
                </div>

                {story.illustrationUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={story.illustrationUrl}
                    alt=""
                    className="mb-3 h-40 w-full rounded-2xl object-cover"
                    loading="lazy"
                  />
                )}

                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{story.content}</p>

                {story.islamicLesson && (
                  <p className="mt-3 rounded-2xl border border-teal-100 bg-teal-50/60 p-3 text-sm text-teal-900">
                    <span className="font-bold">Lesson: </span>
                    {story.islamicLesson}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}

        <p className="flex items-start gap-2 rounded-2xl border border-teal-100 bg-white p-4 text-xs text-gray-600">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-teal-600" aria-hidden />
          Only content approved by a teacher is shown, and children are identified by a safe display name only.
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  href,
  linkLabel,
}: {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-teal-200 bg-white p-10 text-center">
      <p className="text-lg font-bold text-gray-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
