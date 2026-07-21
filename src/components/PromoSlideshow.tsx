'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Slide = {
  id: number;
  gradient: string;
  emoji: string;
  eyebrow: string;
  headline: string;
  sub: string;
  cta?: { label: string; href: string };
  pattern: string; // inline SVG data-uri for subtle background texture
};

const SLIDES: Slide[] = [
  {
    id: 1,
    gradient: 'linear-gradient(135deg,#115e59 0%,#0d9488 50%,#134e4a 100%)',
    emoji: '🏆',
    eyebrow: 'Weekly Competition',
    headline: 'Win Amazing Prizes!',
    sub: 'Qualify with 150+ weekly points and you could be picked at random for exciting rewards. Play quizzes & games to enter the draw!',
    cta: { label: 'View Leaderboard', href: '/leaderboard' },
    pattern:
      "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
  },
  {
    id: 2,
    gradient: 'linear-gradient(135deg,#115e59 0%,#0d9488 50%,#134e4a 100%)',
    emoji: '⭐',
    eyebrow: 'Daily Quiz Challenge',
    headline: 'Earn Points Every Day',
    sub: 'Answer Islamic questions, collect points, and unlock badges. New quiz every 24 hours!',
    cta: { label: 'Take Today\'s Quiz', href: '/quiz' },
    pattern:
      "url(\"data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
  },
  {
    id: 3,
    gradient: 'linear-gradient(135deg,#b45309 0%,#fbbf24 50%,#d97706 100%)',
    emoji: '🎁',
    eyebrow: 'Prize Pool',
    headline: 'Great Prizes Await You!',
    sub: 'Winners receive special Islamic gifts, certificates, and surprise rewards. Will YOU be next?',
    cta: { label: 'See Rewards', href: '/rewards' },
    pattern:
      "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")",
  },
  {
    id: 4,
    gradient: 'linear-gradient(135deg,#115e59 0%,#0f766e 50%,#134e4a 100%)',
    emoji: '📿',
    eyebrow: 'Pledge Durood & Zikr',
    headline: 'Earn Blessings & Points',
    sub: 'Log your daily Durood and Zikr to earn extra points, maintain streaks, and inspire others!',
    cta: { label: 'Pledge Now', href: '/pledge' },
    pattern:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='72' viewBox='0 0 36 72'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M2 6h12L8 18 2 6zm18 36h12l-6 12-6-12z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
  },
  {
    id: 5,
    gradient: 'linear-gradient(135deg,#b8323e 0%,#ff6b6b 50%,#962d36 100%)',
    emoji: '🌟',
    eyebrow: 'Weekly Prize Draw',
    headline: 'Anyone Can Win!',
    sub: 'Stay active and earn 150+ points to enter the random draw. The leaderboard shows progress — winners are not picked by rank.',
    cta: { label: 'Check Leaderboard', href: '/leaderboard' },
    pattern:
      "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E\")",
  },
  {
    id: 6,
    gradient: 'linear-gradient(135deg,#134e4a 0%,#0d9488 50%,#134e4a 100%)',
    emoji: '📝',
    eyebrow: 'Tasks & Rewards',
    headline: 'Invite Friends & Earn Points!',
    sub: 'Refer a friend to Kids Zone and earn +50 points when they sign up. Leave a review on the App Store for +30 bonus points!',
    cta: { label: 'Go to Tasks', href: '/tasks' },
    pattern:
      "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
  },
  {
    id: 7,
    gradient: 'linear-gradient(135deg,#134e4a 0%,#0d9488 50%,#134e4a 100%)',
    emoji: '📞',
    eyebrow: 'Need Help?',
    headline: "We're Here for You",
    sub: 'Any issues, questions or feedback? Message us on WhatsApp and we\'ll get back to you quickly.',
    cta: { label: 'WhatsApp 07404 644610', href: 'https://wa.me/447404644610' },
    pattern:
      "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23fff' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E\")",
  },
];

const INTERVAL_MS = 4500;

export function PromoSlideshow() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setActive(idx);
      setAnimating(false);
    }, 250);
  }, [animating]);

  const next = useCallback(() => goTo((active + 1) % SLIDES.length), [active, goTo]);
  const prev = useCallback(() => goTo((active - 1 + SLIDES.length) % SLIDES.length), [active, goTo]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(next, INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, paused]);

  const slide = SLIDES[active];

  const ctaIsExternal = slide.cta?.href.startsWith('http');

  return (
    <div
      className="relative w-full overflow-hidden select-none border-b border-black/5"
      style={{ minHeight: 180 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* Slide background */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: slide.gradient,
          backgroundImage: `${slide.pattern}, ${slide.gradient}`,
          opacity: animating ? 0 : 1,
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-6 sm:py-8"
        style={{ opacity: animating ? 0 : 1, transition: 'opacity 0.25s ease' }}
      >
        <span className="text-3xl sm:text-4xl mb-1 drop-shadow-md">{slide.emoji}</span>
        <span className="text-white/70 text-xs sm:text-sm font-semibold uppercase tracking-widest mb-1">
          {slide.eyebrow}
        </span>
        <h2 className="font-heading text-white text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight drop-shadow-md mb-2">
          {slide.headline}
        </h2>
        <p className="text-white/85 text-xs sm:text-sm max-w-xl leading-relaxed mb-4 drop-shadow">
          {slide.sub}
        </p>
        {slide.cta && (
          ctaIsExternal ? (
            <a
              href={slide.cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/18 px-5 py-2.5 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-white/28 active:bg-white/35"
            >
              {slide.cta.label} →
            </a>
          ) : (
            <Link
              href={slide.cta.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/18 px-5 py-2.5 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-white/28 active:bg-white/35"
            >
              {slide.cta.label} →
            </Link>
          )
        )}
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center text-lg transition-all"
      >
        ‹
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center text-lg transition-all"
      >
        ›
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === active ? 20 : 8,
              height: 8,
              background: i === active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
