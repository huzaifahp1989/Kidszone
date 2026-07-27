'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { BookOpen, Heart, Share2, Lightbulb } from 'lucide-react';
import { islamicQuotesList, getQuotesForDay } from '@/data/islamic-quotes';

export default function IslamicQuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<typeof islamicQuotesList>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dailyQuotes = getQuotesForDay();
    setQuotes(dailyQuotes);
    setSelectedIndex(0);

    // Load liked quotes from localStorage
    const storedLikes = localStorage.getItem('liked-quotes');
    if (storedLikes) {
      try {
        setLiked(new Set(JSON.parse(storedLikes)));
      } catch {
        // ignore
      }
    }
  }, []);

  const currentQuote = quotes[selectedIndex];

  const toggleLike = (quoteId: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(quoteId)) {
        next.delete(quoteId);
      } else {
        next.add(quoteId);
      }
      localStorage.setItem('liked-quotes', JSON.stringify([...next]));
      return next;
    });
  };

  const shareQuote = () => {
    if (!currentQuote) return;
    const text = `"${currentQuote.text}" - ${currentQuote.reference}`;
    if (navigator.share) {
      navigator.share({ title: 'Islamic Quote', text });
    } else {
      alert('Copy this quote:\n\n' + text);
    }
  };

  const nextQuote = () => {
    if (selectedIndex < quotes.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      containerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const prevQuote = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
      containerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!currentQuote) {
    return (
      <div className="page-inner">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-slate-500">Loading quotes...</div>
        </div>
      </div>
    );
  }

  const isLiked = liked.has(currentQuote.id);

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-2xl space-y-4">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-200">
            <Lightbulb size={14} className="text-amber-700" />
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Daily Inspiration</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Islamic Quotes</h1>
          <p className="text-sm text-slate-600">
            5 daily quotes to inspire you
          </p>
        </div>

        {/* Main Quote Card */}
        <div
          ref={containerRef}
          className="rounded-xl shadow-lg overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-5 text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-widest text-purple-200 mb-2">
                  Quote {selectedIndex + 1} of {quotes.length}
                </div>
                <div className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                  {currentQuote.category}
                </div>
              </div>
              <Heart
                size={28}
                className={`cursor-pointer transition-all ${
                  isLiked
                    ? 'fill-red-400 text-red-400'
                    : 'text-white/60 hover:text-white'
                }`}
                onClick={() => toggleLike(currentQuote.id)}
              />
            </div>

            {/* Quote Text */}
            <p className="text-lg md:text-xl font-serif leading-relaxed italic">
              "{currentQuote.text}"
            </p>

            {/* Reference */}
            <div className="mt-3 text-purple-100 text-xs font-medium">
              — {currentQuote.reference}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-5 space-y-4">
            {/* Meaning */}
            <div className="rounded-lg bg-white p-4 border border-purple-100">
              <h3 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-600" />
                What does it mean?
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">{currentQuote.meaning}</p>
            </div>

            {/* Author */}
            <div className="text-xs text-slate-600 italic">
              <strong>Source:</strong> {currentQuote.author}
            </div>

            {/* Reflection */}
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
              <h3 className="font-bold text-sm text-amber-900 mb-2 flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-600" />
                Reflection
              </h3>
              <p className="text-sm text-amber-900 leading-relaxed">{currentQuote.reflection}</p>
            </div>
          </div>
        </div>

        {/* Navigation & Actions */}
        <div className="space-y-3">
          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={prevQuote}
              disabled={selectedIndex === 0}
              className="flex-1"
            >
              ← Previous Quote
            </Button>
            <Button
              variant="primary"
              onClick={shareQuote}
              className="flex-1"
            >
              <Share2 size={18} />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={nextQuote}
              disabled={selectedIndex === quotes.length - 1}
              className="flex-1"
            >
              Next Quote →
            </Button>
          </div>

          {/* Quote Indicators */}
          <div className="flex gap-2 justify-center flex-wrap">
            {quotes.map((quote, idx) => (
              <button
                key={quote.id}
                onClick={() => setSelectedIndex(idx)}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === selectedIndex
                    ? 'w-8 bg-indigo-600'
                    : 'bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to quote ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Liked Quotes Info */}
        {liked.size > 0 && (
          <div className="rounded-lg bg-rose-50 p-3 border border-rose-200">
            <p className="text-xs text-rose-800">
              ❤️ {liked.size} liked{liked.size !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
