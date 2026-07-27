'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { BookOpen, Award, Clock, ChevronRight } from 'lucide-react';
import { islamicStoriesList, getStoriesForDay } from '@/data/islamic-stories';

export default function IslamicStoriesPage() {
  const router = useRouter();
  const todaysStory = getStoriesForDay();

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center gap-2 text-sm">
          <Button variant="outline" onClick={() => router.back()}>
            ← Back
          </Button>
          <Button variant="outline" onClick={() => router.push('/')}>
            Home
          </Button>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-full border border-orange-200">
            <BookOpen size={14} className="text-orange-700" />
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">Islamic Stories</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Stories with Lessons</h1>
          <p className="text-sm text-slate-600">Read inspiring Islamic stories and earn 25 points each</p>
        </div>

        {/* Featured: Today's Story */}
        {todaysStory.length > 0 && (
          <div className="rounded-xl shadow-lg overflow-hidden bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-orange-300">
            <div className="bg-gradient-to-r from-orange-600 to-yellow-600 px-4 py-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} />
                <span className="text-xs font-bold uppercase tracking-wide">Today's Featured Story</span>
              </div>
              <h2 className="text-xl font-bold">{todaysStory[0].title}</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-slate-700">
                <strong>Characters:</strong> {todaysStory[0].characters.join(', ')}
              </p>
              <p className="text-sm text-slate-700 line-clamp-2">{todaysStory[0].narrative}</p>
              <p className="text-sm text-orange-800 italic">
                <strong>Lesson:</strong> {todaysStory[0].lesson}
              </p>
              <Button
                variant="primary"
                onClick={() => router.push('/stories/islamic/daily')}
                className="w-full"
              >
                <Award size={18} />
                Read Today's Story • +25 points
              </Button>
            </div>
          </div>
        )}

        {/* All Stories Grid */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">📚 All Stories ({islamicStoriesList.length})</h2>

          <div className="grid gap-3 md:grid-cols-2">
            {islamicStoriesList.map((story) => {
              const isToday = todaysStory.some((s) => s.id === story.id);

              return (
                <div
                  key={story.id}
                  className={`rounded-lg p-4 border-2 transition-all cursor-pointer ${
                    isToday
                      ? 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-200'
                      : 'bg-white border-slate-200 hover:border-orange-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-2">
                    {isToday && (
                      <div className="inline-block px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-bold">
                        ⭐ Today's Story
                      </div>
                    )}
                    <h3 className="font-bold text-slate-900">{story.title}</h3>

                    <p className="text-xs text-slate-600">
                      <strong>Characters:</strong> {story.characters.join(', ')}
                    </p>

                    <p className="text-xs text-slate-700 line-clamp-2">{story.lesson}</p>

                    <div className="flex items-center gap-2 pt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                        <Award size={12} />
                        25 pts
                      </span>
                      <span className="text-xs text-slate-500">
                        {story.questions.length} questions
                      </span>
                    </div>

                    <Button
                      variant={isToday ? 'primary' : 'outline'}
                      onClick={() =>
                        router.push(isToday ? '/stories/islamic/daily' : `/stories/islamic/${story.id}`)
                      }
                      className="w-full text-sm mt-2"
                    >
                      {isToday ? '⭐ Read Today' : '📖 Read Story'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 p-4 border border-orange-200">
          <h4 className="font-bold text-sm text-orange-900 mb-2">📖 How It Works:</h4>
          <ul className="text-sm text-orange-900 space-y-1">
            <li>✓ Each day has a featured story (marked with ⭐)</li>
            <li>✓ Complete the story and answer all questions</li>
            <li>✓ Earn 25 points when you finish</li>
            <li>✓ You can read any story from the collection</li>
            <li>✓ Stories teach values like kindness, honesty, and patience</li>
          </ul>
        </div>

        {/* Back to Home */}
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="w-full"
        >
          ← Back to Home
        </Button>
      </div>
    </div>
  );
}
