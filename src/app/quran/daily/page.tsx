'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { Book, Volume2, Heart } from 'lucide-react';
import { quranSurahs } from '@/data/quran';

function seededShuffle(seed: number, length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  let s = seed >>> 0;
  for (let i = indices.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

function getTodaysSurah() {
  const dayIndex = Math.floor(new Date().getTime() / 86_400_000);
  const shuffled = seededShuffle(dayIndex + 99, quranSurahs.length);
  return quranSurahs[shuffled[0]];
}

export default function DailyQuranPage() {
  const router = useRouter();
  const [surah, setSurah] = useState<typeof quranSurahs[0] | null>(null);
  const [liked, setLiked] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    const todaysSurah = getTodaysSurah();
    setSurah(todaysSurah);

    // Check if already liked
    const liked = localStorage.getItem(`surah-liked-${todaysSurah.id}`);
    setLiked(!!liked);
  }, []);

  const toggleLike = () => {
    if (!surah) return;
    if (liked) {
      localStorage.removeItem(`surah-liked-${surah.id}`);
      setLiked(false);
    } else {
      localStorage.setItem(`surah-liked-${surah.id}`, 'true');
      setLiked(true);
    }
  };

  if (!surah) {
    return (
      <div className="page-inner">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-slate-500">Loading today's Surah...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => router.back()}>
            ← Back
          </Button>
          <Button variant="outline" onClick={() => router.push('/')}>
            Home
          </Button>
        </div>

        {/* Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
            <Book size={16} className="text-blue-700" />
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Daily Ayah</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Today's Quran Reflection</h1>
          <p className="text-slate-600">One Surah changes every day. Read, reflect, and grow closer to Allah's word.</p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl shadow-lg overflow-hidden bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100">
          {/* Surah Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">
                  Surah {surah.number}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white">{surah.englishName}</h2>
                <p className="text-blue-100 text-lg mt-1 font-serif">{surah.arabicName}</p>
              </div>
              <Heart
                size={28}
                className={`cursor-pointer transition-all ${
                  liked
                    ? 'fill-red-400 text-red-400'
                    : 'text-white/60 hover:text-white'
                }`}
                onClick={toggleLike}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Introduction */}
            <div className="rounded-xl bg-white p-6 border border-blue-100">
              <h3 className="font-bold text-slate-900 mb-3 text-lg">About This Surah</h3>
              <p className="text-slate-700 leading-relaxed text-base">{surah.intro}</p>
            </div>

            {/* Main Lesson */}
            <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 p-6 border border-indigo-200">
              <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                <span className="text-xl">📚</span>
                Main Lesson
              </h3>
              <p className="text-indigo-900 font-medium">{surah.mainLesson}</p>
            </div>

            {/* Why Read */}
            <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-6 border border-amber-200">
              <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <span className="text-xl">✨</span>
                Why Read This Surah?
              </h3>
              <p className="text-amber-900">{surah.whyRead}</p>
            </div>

            {/* Facts */}
            {surah.facts && surah.facts.length > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-6 border border-purple-200">
                <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">💡</span>
                  Did You Know?
                </h3>
                <ul className="space-y-2">
                  {surah.facts.map((fact, idx) => (
                    <li key={idx} className="flex gap-3 text-purple-900">
                      <span className="font-bold text-purple-600">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ayahs Section */}
            {surah.ayahs && surah.ayahs.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-lg">Selected Verses (Ayahs)</h3>

                {surah.ayahs.map((ayah, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-white p-6 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                        Ayah {ayah.number}
                      </span>
                      <button
                        onClick={() => setAudioPlaying(!audioPlaying)}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                        title="Play Arabic pronunciation (coming soon)"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>

                    {/* Arabic Text */}
                    <div className="text-right mb-4">
                      <p className="text-2xl md:text-3xl font-serif text-slate-800 leading-relaxed">
                        {ayah.arabic}
                      </p>
                    </div>

                    {/* English Translation */}
                    <div className="text-left">
                      <p className="text-slate-700 italic leading-relaxed">
                        "{ayah.english}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reflection Prompt */}
        <div className="rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 p-6 border border-rose-200">
          <h3 className="font-bold text-rose-900 mb-3 flex items-center gap-2">
            <span className="text-xl">🤔</span>
            Reflect
          </h3>
          <p className="text-rose-900 mb-3">
            Take a moment to think about these verses. How can you apply this lesson in your daily life?
          </p>
          <textarea
            placeholder="Write your thoughts and reflections here..."
            className="w-full p-3 rounded-lg border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            rows={4}
          />
        </div>

        {/* Bottom Navigation */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/quran-quiz')}
            className="flex-1"
          >
            📖 Take Quran Quiz
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push('/quote')}
            className="flex-1"
          >
            💭 Daily Quotes
          </Button>
        </div>
      </div>
    </div>
  );
}
