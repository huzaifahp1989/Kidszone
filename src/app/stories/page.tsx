'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types/stories';
import { BookOpen, Mic, Star, PlayCircle, Headphones } from 'lucide-react';
import { Button } from '@/components';

export default function StoriesListPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-kids-bg p-8 flex justify-center items-center">
        <div className="animate-spin text-4xl">🌟</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kids-bg pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-islamic-primary font-fredoka">
            📚 Islamic Stories
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Read, listen, and record authentic stories from the Quran and Sunnah!
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Stories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <div key={story.id} className="bg-white rounded-3xl p-6 shadow-xl border-2 border-indigo-100 hover:border-indigo-300 transition-all hover:shadow-2xl flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-indigo-50 rounded-2xl">
                  <BookOpen className="w-8 h-8 text-indigo-500" />
                </div>
                <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {story.age_min}-{story.age_max} Years
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">
                {story.title}
              </h3>
              
              <p className="text-slate-600 text-sm mb-6 flex-grow line-clamp-3">
                {story.summary}
              </p>

              <div className="flex gap-2 mt-auto">
                <Link href={`/stories/${story.id}`} className="flex-1">
                  <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-200">
                    <Headphones className="w-4 h-4 mr-2" />
                    Read & Listen
                  </Button>
                </Link>
                
                <Link href={`/stories/${story.id}/record`}>
                  <Button variant="secondary" className="px-3 bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100">
                    <Mic className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}

          {/* Fallback Empty State */}
          {stories.length === 0 && !error && (
            <div className="col-span-full text-center py-12 bg-white/50 rounded-3xl border-2 border-dashed border-slate-300">
              <p className="text-slate-500 text-lg">No stories available yet.</p>
              <p className="text-sm text-slate-400">Please ask an admin to add some stories!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
