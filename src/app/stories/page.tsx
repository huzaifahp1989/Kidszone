'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types/stories';
import { BookOpen, Mic, Search, Sparkles, Star } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAgeMode } from '@/lib/age-mode';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';

export default function StoriesListPage() {
  const { profile } = useAuth();
  const { isYounger } = useAgeMode();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStories();
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

  const storyEmojis = ['📖', '🕌', '🌙', '⭐', '🌟', '🤲', '📿', '🕋', '✨', '🕊️'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ff] pattern-islamic p-8 flex justify-center items-center">
        <div className="w-full max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-[#c4b5fd]/20 animate-pulse">
                <div className="h-12 w-12 rounded-xl bg-[#ede9fe] mb-4" />
                <div className="h-6 w-3/4 rounded bg-[#ede9fe] mb-3" />
                <div className="h-4 w-full rounded bg-[#ede9fe] mb-2" />
                <div className="h-4 w-5/6 rounded bg-[#ede9fe] mb-6" />
                <div className="flex gap-2">
                  <div className="h-10 flex-1 rounded-xl bg-[#ede9fe]" />
                  <div className="h-10 w-20 rounded-xl bg-[#ede9fe]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-white rounded-2xl shadow-lg border border-[#c4b5fd]/30 overflow-hidden">
          <div className="bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] p-8 md:p-10 text-white">
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story, index) => (
            <div
              key={story.id}
              className="bg-white rounded-2xl p-6 shadow-lg border border-[#c4b5fd]/20 flex flex-col"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f5f3ff] text-2xl">
                {storyEmojis[index % storyEmojis.length]}
              </div>
              <h2 className="text-xl font-bold text-[#1e1b4b] mb-2">{story.title}</h2>
              <p className="text-sm text-[#475569] mb-4 flex-1 line-clamp-3">{story.summary}</p>
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
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-4 py-2.5 text-sm font-bold text-white"
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
