'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types/stories';
import { BookOpen, Mic, Search, Sparkles, Star, Volume2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAgeMode } from '@/lib/age-mode';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';

type ApprovedCommunityStory = {
  id: string;
  title: string;
  content: string;
  islamicLesson: string;
  category: string | null;
  illustrationUrl: string | null;
  ageGroup: string;
  author: string;
  approvedAt: string | null;
};

export default function StoriesListPage() {
  const { profile } = useAuth();
  const { isYounger } = useAgeMode();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [communityStories, setCommunityStories] = useState<ApprovedCommunityStory[]>([]);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [expandedCommunityStoryId, setExpandedCommunityStoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchStories();
    fetchCommunityStories();
  }, []);

  async function fetchStories() {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('stories')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setStories(data || []);
    } catch (err: unknown) {
      console.error('Error fetching stories:', err);
      setError('Failed to load stories. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCommunityStories() {
    try {
      const response = await fetch('/api/story-writing/approved', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load approved community stories.');
      const payload = await response.json();
      setCommunityStories(Array.isArray(payload.stories) ? payload.stories : []);
    } catch (fetchError) {
      console.error('Error fetching approved community stories:', fetchError);
      setCommunityError('Approved community stories could not be loaded right now.');
    }
  }

  const age = Number(profile?.age ?? 0);
  const hasAge = Number.isFinite(age) && age >= 1;

  const filteredStories = stories.filter((story) => {
    if (hasAge) {
      const min = Number(story.age_min ?? 0);
      const max = Number(story.age_max ?? 120);
      if (age < min || age > max) return false;
    } else if (isYounger) {
      if (Number(story.age_min ?? 0) > 8) return false;
    }

    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${story.title} ${story.summary ?? ''}`.toLowerCase().includes(q);
  });
  const query = search.trim().toLowerCase();
  const filteredCommunityStories = communityStories.filter((story) =>
    !query || `${story.title} ${story.content} ${story.islamicLesson} ${story.category ?? ''}`.toLowerCase().includes(query)
  );

  const storyEmojis = ['📖', '🕌', '🌙', '⭐', '🌟', '🤲', '📿', '🕋', '✨', '🕊️'];

  if (loading) {
    return (
      <div className="min-h-screen bg-teal-50 pattern-islamic p-8 flex justify-center items-center">
        <div className="w-full max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-teal-300/20 animate-pulse">
                <div className="h-12 w-12 rounded-xl bg-teal-100 mb-4" />
                <div className="h-6 w-3/4 rounded bg-teal-100 mb-3" />
                <div className="h-4 w-full rounded bg-teal-100 mb-2" />
                <div className="h-4 w-5/6 rounded bg-teal-100 mb-6" />
                <div className="flex gap-2">
                  <div className="h-10 flex-1 rounded-xl bg-teal-100" />
                  <div className="h-10 w-20 rounded-xl bg-teal-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-50 pattern-islamic pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-white rounded-2xl shadow-lg border border-teal-300/30 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-400 to-teal-500 p-8 md:p-10 text-white">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-bold">
                  <Sparkles size={16} /> Story Time
                </div>
                <h1 className="text-4xl md:text-5xl font-bold">Islamic Stories</h1>
                <p className="text-white/80 max-w-2xl">
                  {isYounger
                    ? `Read a story, then try the mini-quiz for +${ACTIVITY_BONUS_POINTS} points once a day.`
                    : `Age-matched stories with a reflection mini-quiz (+${ACTIVITY_BONUS_POINTS} pts/day) and recording rewards.`}
                </p>
                <a
                  href="https://traespeechhelpbe6b.vercel.app/quran/listen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/15 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Volume2 size={18} aria-hidden="true" />
                  Listen to Quran
                </a>
              </div>
              <div className="w-full md:w-[320px]">
                <div className="relative">
                  <Search className="w-4 h-4 text-white/50 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search stories..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-0 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
                <div className="mt-2 text-sm text-white/60">
                  {filteredStories.length} stor{filteredStories.length === 1 ? 'y' : 'ies'}
                  {hasAge ? ` for age ${age}` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <section aria-labelledby="community-stories-title" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Written by young writers</p>
              <h2 id="community-stories-title" className="text-2xl font-black text-emerald-950">Community Stories</h2>
              <p className="mt-1 text-sm text-slate-600">Stories approved by our moderators, shared for everyone to read.</p>
            </div>
            <Link href="/story-writer" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800">
              ✍️ Write a story
            </Link>
          </div>
          {communityError && (
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{communityError}</p>
          )}
          {filteredCommunityStories.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCommunityStories.map((story, index) => (
                <article key={story.id} className="flex flex-col rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                  {story.illustrationUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={story.illustrationUrl} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" loading="lazy" />
                  )}
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-2xl" aria-hidden="true">
                    {storyEmojis[index % storyEmojis.length]}
                  </div>
                  <h3 className="text-lg font-black text-emerald-950">{story.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    By {story.author}{story.category ? ` · ${story.category}` : ''}
                  </p>
                  {story.approvedAt && (
                    <time dateTime={story.approvedAt} className="mt-1 text-xs text-slate-500">
                      Approved {new Date(story.approvedAt).toLocaleDateString()}
                    </time>
                  )}
                  <p className={`mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-slate-700 ${expandedCommunityStoryId === story.id ? '' : 'line-clamp-3'}`}>
                    {story.content}
                  </p>
                  {expandedCommunityStoryId === story.id && story.islamicLesson && (
                    <aside className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <h4 className="font-bold text-amber-950">Islamic lesson</h4>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-amber-900">{story.islamicLesson}</p>
                    </aside>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedCommunityStoryId((current) => current === story.id ? null : story.id)}
                    className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                    aria-expanded={expandedCommunityStoryId === story.id}
                  >
                    {expandedCommunityStoryId === story.id ? 'Show less' : 'Read full story'}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            !communityError && (
              <p className="rounded-2xl border border-emerald-100 bg-white p-5 text-sm text-slate-600">
                {communityStories.length === 0
                  ? 'No community stories have been approved yet. Check back soon!'
                  : 'No approved community stories match your search.'}
              </p>
            )
          )}
        </section>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story, index) => (
            <div
              key={story.id}
              className="bg-white rounded-2xl p-6 shadow-lg border border-teal-300/20 flex flex-col"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-2xl">
                {storyEmojis[index % storyEmojis.length]}
              </div>
              <h2 className="text-xl font-bold text-teal-900 mb-2">{story.title}</h2>
              <p className="text-sm text-sand-700 mb-4 flex-1 line-clamp-3">{story.summary}</p>
              <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-violet-700">
                <span className="rounded-full bg-violet-50 px-2 py-1">
                  Ages {story.age_min}–{story.age_max}
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">
                  Quiz +{ACTIVITY_BONUS_POINTS}
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/stories/${story.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-2.5 text-sm font-bold text-white"
                >
                  <BookOpen size={16} /> Read
                </Link>
                <Link
                  href={`/stories/${story.id}?tab=quiz`}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm font-bold text-violet-700"
                >
                  <Star size={14} /> Quiz
                </Link>
                <Link
                  href={`/stories/${story.id}?tab=record`}
                  className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-rose-600"
                  aria-label="Record"
                >
                  <Mic size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {!loading && filteredStories.length === 0 && (
          <div className="rounded-2xl border border-violet-100 bg-white p-8 text-center text-slate-600">
            No stories match your age filter right now. Check back soon!
          </div>
        )}
      </div>
    </div>
  );
}
