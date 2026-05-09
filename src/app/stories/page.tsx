'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types/stories';
import { BookOpen, Mic, Search, Sparkles, Star } from 'lucide-react';

export default function StoriesListPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchStories(); }, []);

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

  const storyEmojis = ['📖', '🕌', '🌙', '⭐', '🌟', '🤲', '📿', '🕋', '✨', '🕊️'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf8f3] pattern-islamic p-8 flex justify-center items-center">
        <div className="w-full max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-[#e5c9a3]/20 animate-pulse">
                <div className="h-12 w-12 rounded-xl bg-[#f9f0e6] mb-4" />
                <div className="h-6 w-3/4 rounded bg-[#f9f0e6] mb-3" />
                <div className="h-4 w-full rounded bg-[#f9f0e6] mb-2" />
                <div className="h-4 w-5/6 rounded bg-[#f9f0e6] mb-6" />
                <div className="flex gap-2">
                  <div className="h-10 flex-1 rounded-xl bg-[#f9f0e6]" />
                  <div className="h-10 w-20 rounded-xl bg-[#f9f0e6]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8f3] pattern-islamic pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#e5c9a3]/30 overflow-hidden">
          <div className="bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] p-8 md:p-10 text-white">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-bold">
                  <Sparkles size={16} /> Story Time
                </div>
                <h1 className="text-4xl md:text-5xl font-bold">Islamic Stories</h1>
                <p className="text-white/80 max-w-2xl">
                  Read beautiful stories from the Quran and Sunnah. Record yourself reading to earn 30 points!
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Points Banner */}
        <div className="bg-gradient-to-r from-[#fbbf24]/20 via-[#fbbf24]/10 to-[#fbbf24]/20 rounded-2xl border border-[#fbbf24]/30 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center shadow-md">
            <Star size={24} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-[#6a422d]">Record a story & earn 30 points!</p>
            <p className="text-sm text-[#a1633a]">Click the mic button on any story to start recording</p>
          </div>
        </div>

        {error && (
          <div className="bg-[#fff5f5] text-[#ff4757] p-4 rounded-xl text-center border border-[#ff6b6b]/30">
            {error}
          </div>
        )}

        {/* Stories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story, idx) => (
            <div
              key={story.id}
              className="group bg-white rounded-2xl shadow-lg border border-[#e5c9a3]/20 hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col overflow-hidden"
            >
              {/* Gradient top bar */}
              <div className="h-2 bg-gradient-to-r from-[#8b5cf6] via-[#14b8a6] to-[#fbbf24]" />

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[#eef2ff] to-[#f0fdfa] border border-[#8b5cf6]/10">
                    <span className="text-2xl">{storyEmojis[idx % storyEmojis.length]}</span>
                  </div>
                  <div className="bg-[#f0fdfa] text-[#0d9488] px-3 py-1 rounded-full text-xs font-bold border border-[#14b8a6]/20">
                    Authentic
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[#6a422d] mb-2 line-clamp-2">
                  {story.title}
                </h3>

                <p className="text-[#a1633a] text-sm mb-6 flex-grow line-clamp-3">
                  {story.summary}
                </p>

                <div className="flex gap-2 mt-auto">
                  <Link href={`/stories/${story.id}`} className="flex-1">
                    <button className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                      <BookOpen size={16} /> Read
                    </button>
                  </Link>

                  <a href="https://create-me-a-audio.vercel.app/kids-record" target="_blank" rel="noopener noreferrer">
                    <button className="px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-[#ff6b6b] to-[#ff4757] text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                      <Mic size={16} /> <span className="hidden sm:inline">Record</span>
                      <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-md">+30</span>
                    </button>
                  </a>
                </div>
              </div>
            </div>
          ))}

          {filteredStories.length === 0 && !error && (
            <div className="col-span-full text-center py-14 bg-white/70 rounded-2xl border border-[#e5c9a3]/20 shadow-sm">
              <div className="text-4xl mb-2">📖</div>
              <p className="text-[#6a422d] text-lg font-semibold">No stories found</p>
              <p className="text-sm text-[#a1633a] mt-1">Try a different search, or refresh the library.</p>
              <button
                className="mt-5 px-6 py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold rounded-xl shadow-md"
                onClick={() => fetchStories()}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
