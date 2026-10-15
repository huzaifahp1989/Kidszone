'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { WHATS_NEW_ITEMS } from '@/lib/whats-new';

const FEATURE_ITEMS = WHATS_NEW_ITEMS.slice(0, 5);

export function FeatureSpotlightCarousel() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (paused || reduceMotion || FEATURE_ITEMS.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % FEATURE_ITEMS.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion]);

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + FEATURE_ITEMS.length) % FEATURE_ITEMS.length);
  };
  const showNext = () => {
    setActiveIndex((current) => (current + 1) % FEATURE_ITEMS.length);
  };
  const item = FEATURE_ITEMS[activeIndex];

  if (!item) return null;

  return (
    <section
      className="border-b border-emerald-100 bg-white/80 px-3 py-1.5 sm:px-6"
      aria-label="New and featured activities"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2">
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900 sm:inline-flex">
          <Sparkles size={12} aria-hidden="true" />
          New
        </span>
        <button
          type="button"
          onClick={showPrevious}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          aria-label="Previous featured activity"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <Link
          key={item.href}
          href={item.href}
          className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-1 py-1 text-center transition hover:bg-teal-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:gap-3"
          aria-roledescription="slide"
          aria-label={`${activeIndex + 1} of ${FEATURE_ITEMS.length}: ${item.title}`}
        >
          <span className="shrink-0 text-xl sm:text-2xl" aria-hidden="true">{item.emoji}</span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-extrabold text-teal-950 sm:text-sm">{item.title}</span>
            <span className="hidden truncate text-xs text-sand-600 sm:block">{item.blurb}</span>
          </span>
          <span className="hidden shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-900 sm:inline-flex">
            Explore →
          </span>
        </Link>
        <div className="hidden shrink-0 items-center gap-1 sm:flex" aria-label="Choose a featured activity">
          {FEATURE_ITEMS.map((feature, index) => (
            <button
              key={feature.href}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                index === activeIndex ? 'w-5 bg-teal-700' : 'w-2 bg-teal-200 hover:bg-teal-400'
              }`}
              aria-label={`Show ${feature.title}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={showNext}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          aria-label="Next featured activity"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
