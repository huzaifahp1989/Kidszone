'use client';

import { MessageSquareHeart, ExternalLink, Sparkles } from 'lucide-react';

const SURVEY_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeuuvHIxe10xDtSTw1wr8K6B66HEUrpF3Y5oZCIP4BMGuUiVA/viewform?usp=publish-editor';

type SurveyBannerProps = {
  compact?: boolean;
};

export function SurveyBanner({ compact = false }: SurveyBannerProps) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-violet-50 p-5 shadow-sm">
      <div className={`flex ${compact ? 'flex-col gap-4' : 'flex-col gap-4 md:flex-row md:items-center md:justify-between'}`}>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            <Sparkles size={14} />
            Kids Zone Survey
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
              <MessageSquareHeart size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Take the survey to win 50 points</h3>
              <p className="mt-1 text-sm text-slate-600">
                Share quick feedback about Kids Zone in our new survey form. It opens in a new tab so it is easy for children and parents to complete.
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0">
          <a
            href={SURVEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Take the survey
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
