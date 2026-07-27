'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { BookOpen, Heart, Lightbulb, CheckCircle } from 'lucide-react';
import { getHadithsForDay } from '@/lib/daily-hadith';
import type { DailyHadith } from '@/lib/daily-hadith';

export default function DailyHadithLearningPage() {
  const router = useRouter();
  const [hadiths, setHadiths] = useState<DailyHadith[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [learned, setLearned] = useState<Set<string>>(new Set());

  useEffect(() => {
    const dailyHadiths = getHadithsForDay();
    setHadiths(dailyHadiths);

    // Load liked and learned from localStorage
    const storedLikes = localStorage.getItem('liked-hadiths');
    const storedLearned = localStorage.getItem('learned-hadiths');
    if (storedLikes) {
      try {
        setLiked(new Set(JSON.parse(storedLikes)));
      } catch {
        // ignore
      }
    }
    if (storedLearned) {
      try {
        setLearned(new Set(JSON.parse(storedLearned)));
      } catch {
        // ignore
      }
    }
  }, []);

  const currentHadith = hadiths[selectedIndex];

  const toggleLike = (hadithId: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(hadithId)) {
        next.delete(hadithId);
      } else {
        next.add(hadithId);
      }
      localStorage.setItem('liked-hadiths', JSON.stringify([...next]));
      return next;
    });
  };

  const markAsLearned = (hadithId: string) => {
    setLearned((prev) => {
      const next = new Set(prev);
      next.add(hadithId);
      localStorage.setItem('learned-hadiths', JSON.stringify([...next]));
      return next;
    });

    // Move to next hadith if available
    if (selectedIndex < hadiths.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const nextHadith = () => {
    if (selectedIndex < hadiths.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const prevHadith = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  if (!currentHadith) {
    return (
      <div className="page-inner">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-slate-500">Loading today's hadith...</div>
        </div>
      </div>
    );
  }

  const isLiked = liked.has(currentHadith.id);
  const isLearned = learned.has(currentHadith.id);

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header Navigation */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => router.back()}>
            ← Back
          </Button>
          <Button variant="outline" onClick={() => router.push('/')}>
            Home
          </Button>
        </div>

        {/* Page Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full border border-teal-200">
            <BookOpen size={16} className="text-teal-700" />
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Daily Hadith</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Learn from the Prophet (SAW)</h1>
          <p className="text-slate-600">5 hadiths rotate daily. Each teaches wisdom and guidance for your life.</p>
        </div>

        {/* Main Hadith Card */}
        <div className="rounded-2xl shadow-lg overflow-hidden bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-8 text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-widest text-teal-100 mb-1">
                  Hadith {selectedIndex + 1} of {hadiths.length}
                </div>
                <div className="text-xs font-bold text-teal-200 uppercase tracking-wider">
                  {currentHadith.topic}
                </div>
              </div>
              <Heart
                size={28}
                className={`cursor-pointer transition-all ${
                  isLiked
                    ? 'fill-red-400 text-red-400'
                    : 'text-white/60 hover:text-white'
                }`}
                onClick={() => toggleLike(currentHadith.id)}
              />
            </div>

            {/* Hadith Text */}
            <p className="text-lg md:text-xl font-serif leading-relaxed italic">
              "{currentHadith.english}"
            </p>

            {/* Source */}
            <div className="mt-4 text-teal-100 text-sm font-medium">
              — {currentHadith.source}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Meaning */}
            <div className="rounded-xl bg-white p-6 border border-teal-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <BookOpen size={18} className="text-teal-600" />
                What Does It Mean?
              </h3>
              <p className="text-slate-700 leading-relaxed text-base">{currentHadith.meaning}</p>
            </div>

            {/* Practical Example */}
            <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 p-6 border border-amber-200">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <span className="text-xl">🌟</span>
                How to Apply It
              </h3>
              <p className="text-amber-900 leading-relaxed">{currentHadith.practicalExample}</p>
            </div>

            {/* Reflection Section */}
            <div className="rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 p-6 border border-rose-200">
              <h3 className="font-bold text-rose-900 mb-3 flex items-center gap-2">
                <Lightbulb size={18} className="text-rose-600" />
                Reflect on This
              </h3>
              <ul className="space-y-2 text-rose-900 text-sm">
                <li className="flex gap-2">
                  <span>💭</span>
                  <span>Think about how this hadith relates to your life today.</span>
                </li>
                <li className="flex gap-2">
                  <span>🤝</span>
                  <span>Who can you help or be kind to using this lesson?</span>
                </li>
                <li className="flex gap-2">
                  <span>📝</span>
                  <span>How will you try to follow this teaching tomorrow?</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={prevHadith}
            disabled={selectedIndex === 0}
            className="flex-1"
          >
            ← Previous Hadith
          </Button>
          <Button
            variant={isLearned ? 'outline' : 'primary'}
            onClick={() => markAsLearned(currentHadith.id)}
            className="flex-1"
          >
            {isLearned ? (
              <>
                <CheckCircle size={18} />
                Learned
              </>
            ) : (
              '✨ Mark as Learned'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={nextHadith}
            disabled={selectedIndex === hadiths.length - 1}
            className="flex-1"
          >
            Next Hadith →
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="flex gap-2 justify-center flex-wrap">
          {hadiths.map((hadith, idx) => (
            <button
              key={hadith.id}
              onClick={() => setSelectedIndex(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === selectedIndex
                  ? 'w-8 bg-teal-600'
                  : learned.has(hadith.id)
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Go to hadith ${idx + 1}`}
              title={learned.has(hadith.id) ? 'Learned' : `Hadith ${idx + 1}`}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-5 border border-indigo-200">
          <p className="text-sm text-indigo-900">
            <strong>Progress Today:</strong> {learned.size} of {hadiths.length} hadiths learned
            {liked.size > 0 && ` • ❤️ {liked.size} liked`}
          </p>
        </div>

        {/* Bottom Links */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/hadith/quiz')}
          >
            📝 Hadith Quiz
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/quotes')}
          >
            💭 Daily Quotes
          </Button>
        </div>
      </div>
    </div>
  );
}
