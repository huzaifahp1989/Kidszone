'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { TAJWEED_GUIDE_GROUPS, TAJWEED_RULES } from '@/data/tajweed-rules';
import { useIsMobile } from '@/lib/use-media-query';

export function TajweedGuide() {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setExpanded(!isMobile);
  }, [isMobile]);

  return (
    <section className="surface-card overflow-hidden rounded-2xl border border-violet-200/80">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-3 bg-gradient-to-r from-violet-50 to-indigo-50/80 px-4 py-3 text-left sm:px-5 sm:py-4"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Palette size={20} className="shrink-0 text-violet-600" />
          <div className="min-w-0">
            <h2 className="font-heading text-base font-bold text-violet-900 sm:text-lg">Tajweed colour guide</h2>
            <p className="truncate text-xs text-sand-600">Tap to {expanded ? 'hide' : 'show'} the colour key</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={20} className="shrink-0 text-violet-600" /> : <ChevronDown size={20} className="shrink-0 text-violet-600" />}
      </button>

      {expanded && (
        <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
          {TAJWEED_GUIDE_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-sm font-bold text-sand-800">
                {group.emoji} {group.title}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.ruleIds.map((ruleId) => {
                  const rule = TAJWEED_RULES[ruleId];
                  if (!rule) return null;
                  return (
                    <div
                      key={ruleId}
                      className="flex items-start gap-3 rounded-xl border border-sand-200/80 bg-white p-3"
                    >
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-arabic text-lg font-bold shadow-sm"
                        style={{ color: rule.color, backgroundColor: `${rule.color}18` }}
                        aria-hidden
                      >
                        {ruleId === 'q' ? 'ق' : ruleId === 'g' ? 'ن' : ruleId === 'n' ? 'ا' : '◆'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold" style={{ color: rule.color }}>
                          {rule.kidName}
                        </p>
                        <p className="mt-0.5 text-xs leading-snug text-sand-600">{rule.kidTip}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="rounded-xl bg-amber-50 px-3 py-3 text-xs leading-relaxed text-amber-950 sm:px-4">
            <strong>Tip for kids:</strong> Colours help you see where to stretch, hum, bounce, hide, or merge sounds.
            Listen to the reciter and try to copy each rule!
          </p>
        </div>
      )}
    </section>
  );
}
