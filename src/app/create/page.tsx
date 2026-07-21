'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Palette, Sparkles } from 'lucide-react';
import { Button } from '@/components';
import { CREATE_HUB_ACTIVITIES } from '@/data/kids-create-activities';
export default function CreateHubPage() {
  const router = useRouter();

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" onClick={() => router.push('/')}>
            ← Home
          </Button>
        </div>

        <header className="page-header">
          <p className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-pink-800">
            <Palette size={14} /> Create & Play
          </p>
          <h1 className="mt-3 font-heading text-3xl font-extrabold text-sand-900 md:text-4xl">
            Fun Islamic activities
          </h1>
          <p className="mt-2 max-w-2xl text-sand-600">
            Colour, draw, trace Arabic, go on a story adventure, say today&apos;s dua, practice good manners,
            and complete a kindness hunt. Finish an activity to claim points (once per type each day), save
            art to My Gallery, and unlock stickers.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {CREATE_HUB_ACTIVITIES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="feature-tile relative flex flex-col rounded-2xl p-4 transition hover:-translate-y-0.5"
            >
              {item.badge && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950">
                  <Sparkles size={10} /> {item.badge}
                </span>
              )}
              <span className="text-3xl" aria-hidden>
                {item.emoji}
              </span>
              <span className="mt-2 text-lg font-extrabold text-sand-900">{item.title}</span>
              <span className="mt-1 text-sm text-sand-600">{item.blurb}</span>
              <span className="mt-3 text-xs font-bold text-teal-700">{item.pointsNote}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
