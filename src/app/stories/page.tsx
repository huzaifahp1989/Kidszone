'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types/stories';
import { BookOpen, Headphones, Mic, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components';

export default function StoriesListPage() {
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

      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
      
    } catch (error: any) {
      console.error('Error fetching stories:', error);
      setError('Failed to load stories. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const filteredStories = stories.filter((story) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${story.title} ${story.summary ?? ''}`.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-kids-bg via-white to-kids-bg p-8 flex justify-center items-center">
        <div className="w-full max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 animate-pulse"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100" />
                  <div className="h-6 w-24 rounded-full bg-slate-100" />
                </div>
                <div className="h-6 w-3/4 rounded bg-slate-100 mb-3" />
                <div className="h-4 w-full rounded bg-slate-100 mb-2" />
                <div className="h-4 w-5/6 rounded bg-slate-100 mb-6" />
                <div className="flex gap-2">
                  <div className="h-10 flex-1 rounded-xl bg-slate-100" />
                  <div className="h-10 w-12 rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-kids-bg via-white to-kids-bg pb-24">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 p-[1px] shadow-xl">
          <div className="rounded-3xl bg-white/90 backdrop-blur p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold">
                  <Sparkles className="w-4 h-4" />
                  Stories for everyone
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 font-fredoka">
                  📚 Islamic Stories
                </h1>
                <p className="text-slate-600 max-w-2xl">
                  Read, listen, and record authentic stories from the Quran and Sunnah.
                </p>
              </div>

              <div className="w-full md:w-[380px]">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search stories..."
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                  />
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{filteredStories.length}</span> story
                  {filteredStories.length === 1 ? '' : 'ies'}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 bg-red-50 text-red-700 p-4 rounded-2xl text-center border border-red-100">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Stories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story) => (
            <div
              key={story.id}
              className="group bg-white rounded-3xl p-6 shadow-xl border border-slate-100 hover:border-indigo-200 transition-all hover:shadow-2xl flex flex-col relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 opacity-70" />

              <div className="flex items-start justify-between mb-5">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-rose-50 border border-indigo-100">
                  <BookOpen className="w-8 h-8 text-indigo-600" />
                </div>
                <div className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                  Authentic
                </div>
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 mb-2 line-clamp-2">
                {story.title}
              </h3>

              <p className="text-slate-600 text-sm mb-6 flex-grow line-clamp-3">
                {story.summary}
              </p>

              <div className="flex gap-2 mt-auto">
                <Link href={`/stories/${story.id}`} className="flex-1">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200">
                    <Headphones className="w-4 h-4 mr-2" />
                    Read & Listen
                  </Button>
                </Link>

                <Link href={`/stories/${story.id}/record`}>
                  <Button
                    variant="secondary"
                    className="px-3 bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}

          {/* Fallback Empty State */}
          {filteredStories.length === 0 && !error && (
            <div className="col-span-full text-center py-14 bg-white/70 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-4xl mb-2">📖</div>
              <p className="text-slate-700 text-lg font-semibold">No stories found</p>
              <p className="text-sm text-slate-500 mt-1">Try a different search, or refresh the library.</p>
              <div className="mt-5 flex justify-center">
                <Button
                  variant="secondary"
                  className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  onClick={() => fetchStories()}
                >
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
