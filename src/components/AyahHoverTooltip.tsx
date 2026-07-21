'use client';

import React, { useState } from 'react';
import { useCanHover } from '@/lib/use-media-query';

type Placement = 'top' | 'bottom';

type AyahHoverTooltipProps = {
  numberInSurah: number;
  english: string;
  children: React.ReactNode;
  className?: string;
  placement?: Placement;
};

const placementStyles: Record<Placement, { tooltip: string; arrow: string }> = {
  top: {
    tooltip:
      'bottom-full left-1/2 mb-2 w-[calc(100vw-2rem)] max-w-xs -translate-x-1/2 sm:w-64',
    arrow:
      'absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b border-violet-200/80 bg-white',
  },
  bottom: {
    tooltip:
      'top-full left-1/2 mt-2 w-[calc(100vw-2rem)] max-w-xs -translate-x-1/2 sm:w-64',
    arrow:
      'absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-violet-200/80 bg-white',
  },
};

export function AyahHoverTooltip({
  numberInSurah,
  english,
  children,
  className = '',
  placement = 'bottom',
}: AyahHoverTooltipProps) {
  const canHover = useCanHover();
  const [visible, setVisible] = useState(false);
  const pos = placementStyles[placement];

  if (!canHover) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      className={`relative ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-40 rounded-xl border border-violet-200/80 bg-white px-3 py-2.5 text-left shadow-lg ring-1 ring-violet-100/80 ${pos.tooltip}`}
        >
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-violet-600">
            Ayah {numberInSurah}
          </span>
          <span className="block text-sm leading-snug text-sand-800">{english}</span>
          <span className={pos.arrow} aria-hidden />
        </span>
      )}
    </span>
  );
}
