'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export type MascotMood = 'happy' | 'wave' | 'celebrate';

interface MascotProps {
  /** Optional speech-bubble message shown next to the character. */
  message?: string;
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { box: 'h-16 w-16', face: 'text-3xl', star: 'text-base' },
  md: { box: 'h-24 w-24', face: 'text-5xl', star: 'text-xl' },
  lg: { box: 'h-32 w-32 md:h-40 md:w-40', face: 'text-6xl md:text-7xl', star: 'text-2xl' },
};

const moodFace: Record<MascotMood, string> = {
  happy: '😊',
  wave: '👋',
  celebrate: '🎉',
};

/**
 * "Noor" - a friendly crescent-moon guide character for younger learners.
 * Pure emoji + CSS so there are no image assets to load. Gentle motion that
 * respects prefers-reduced-motion.
 */
export function Mascot({ message, mood = 'happy', size = 'lg', className = '' }: MascotProps) {
  const reduceMotion = useReducedMotion();
  const s = sizeMap[size];

  const float = reduceMotion
    ? undefined
    : {
        y: [0, -8, 0],
        transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const },
      };

  const celebrate = reduceMotion
    ? undefined
    : {
        rotate: [0, -6, 6, -3, 0],
        transition: { duration: 0.9, repeat: Infinity, repeatDelay: 1.5 },
      };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.div
        aria-hidden="true"
        animate={mood === 'celebrate' ? celebrate : float}
        className="relative shrink-0"
      >
        <div
          className={`${s.box} relative flex items-center justify-center rounded-[2rem] bg-gradient-to-br from-violet-400 via-violet-500 to-indigo-600 shadow-xl ring-4 ring-white/60`}
        >
          <span className={s.face}>{moodFace[mood]}</span>
          <span className={`absolute -left-2 -top-2 ${s.star}`}>⭐</span>
          <span className={`absolute -bottom-2 -right-2 rotate-12 ${s.star}`}>🌙</span>
        </div>
      </motion.div>

      {message ? (
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, x: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="relative max-w-xs rounded-2xl rounded-bl-sm border border-violet-200 bg-white/95 px-4 py-3 text-sm font-semibold text-sand-800 shadow-md"
        >
          <span
            className="absolute -left-1.5 bottom-3 h-3 w-3 rotate-45 border-b border-l border-violet-200 bg-white"
            aria-hidden="true"
          />
          {message}
        </motion.div>
      ) : null}
    </div>
  );
}
