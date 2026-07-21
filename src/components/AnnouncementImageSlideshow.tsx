'use client';

import React, { useEffect, useState } from 'react';

type Props = {
  slides: string[];
  intervalSeconds?: number;
  alt?: string;
};

export function AnnouncementImageSlideshow({ slides, intervalSeconds = 5, alt = 'Announcement slide' }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const ms = Math.max(2000, Math.floor(intervalSeconds) * 1000);
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, ms);
    return () => window.clearInterval(timer);
  }, [slides, intervalSeconds]);

  if (slides.length === 0) return null;

  if (slides.length === 1) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slides[0]}
          alt={alt}
          className="max-h-[min(60vh,420px)] w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900/5">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((url, slideIndex) => (
            <div key={`${url}-${slideIndex}`} className="w-full shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${alt} ${slideIndex + 1} of ${slides.length}`}
                className="max-h-[min(60vh,420px)] w-full object-contain"
              />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/25 to-transparent" />
        <p className="absolute bottom-2 right-3 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white">
          {index + 1} / {slides.length}
        </p>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {slides.map((url, dotIndex) => (
          <button
            key={`dot-${url}-${dotIndex}`}
            type="button"
            aria-label={`Show slide ${dotIndex + 1}`}
            onClick={() => setIndex(dotIndex)}
            className={`h-2.5 rounded-full transition-all ${
              dotIndex === index ? 'w-6 bg-violet-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
