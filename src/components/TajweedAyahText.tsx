'use client';

import React from 'react';
import { renderTajweedArabic } from '@/lib/tajweed-parser';

type Props = {
  arabic: string;
  arabicTajweed?: string;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
};

const sizeClasses = {
  md: 'text-xl leading-[2.35] sm:text-2xl sm:leading-[2.4]',
  lg: 'text-xl leading-[2.4] sm:text-[1.65rem] md:text-3xl md:leading-[2.5]',
  xl: 'text-2xl leading-[2.5] sm:text-3xl md:text-4xl md:leading-[2.6]',
};

export function TajweedAyahText({ arabic, arabicTajweed, size = 'lg', className = '' }: Props) {
  return (
    <div
      className={`tajweed-ayah font-arabic w-full break-words text-right text-violet-900 ${sizeClasses[size]} ${className}`}
      dir="rtl"
    >
      {renderTajweedArabic(arabicTajweed, arabic, 'inline')}
    </div>
  );
}
