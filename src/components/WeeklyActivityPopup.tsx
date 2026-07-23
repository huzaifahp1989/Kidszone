'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { BookOpen, Gamepad2, Mic, Sparkles, Star } from 'lucide-react';

type WeeklyActivities = {
  quiz: number;
  game: number;
  pledge: number;
  recording: number;
};

type WeeklyActivityPopupProps = {
  userId: string;
};

const storageKey = (userId: string) => `kidszone-weekly-activities-popup:${userId}`;

export function WeeklyActivityPopup({ userId }: WeeklyActivityPopupProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(5);
  const [qualified, setQualified] = useState(false);
  const [activities, setActivities] = useState<WeeklyActivities | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!userId || typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      try {
        const popupSeen = window.sessionStorage.getItem(storageKey(userId));
        const res = await fetch(`/api/rewards/weekly-activities?userId=${userId}`, { cache: 'no-store' });
        const data = await res.json();
        if (!active || !res.ok) return;

        setActivities(data.activities);
        setRemaining(Number(data.remaining || 0));
        setQualified(Boolean(data.qualifiedForDraw));

        if (!popupSeen) {
          setOpen(true);
          window.sessionStorage.setItem(storageKey(userId), 'seen');
        }
      } catch {
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [userId]);

  const remainingItems = useMemo(() => {
    if (!activities) return [];
    return [
      { href: '/quiz', icon: BookOpen, label: 'Do quiz activities' },
      { href: '/games', icon: Gamepad2, label: 'Do game activities' },
      { href: '/pledge', icon: Sparkles, label: 'Do Durood & Zikr activities' },
      { href: '/studio', icon: Mic, label: 'Do story recording activities' },
      { href: '/leaderboard', icon: Star, label: 'Any 5 total activities count for the weekly star' },
    ].filter(Boolean) as Array<{ href: string; icon: any; label: string }>;
  }, [activities]);

  if (loading || !userId) return null;

  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      title={qualified ? 'Weekly activities complete' : 'Weekly activities progress'}
      size="lg"
    >
      <div className="space-y-5">
        <div className={`rounded-2xl border p-5 text-center ${qualified ? 'border-amber-200 bg-amber-50' : 'border-teal-200 bg-teal-50'}`}>
          <p className="text-4xl mb-2">{qualified ? '⭐' : '🏆'}</p>
          <p className="text-lg font-bold text-[#1e1b4b]">
            {qualified ? 'Amazing! You completed all 5 weekly activities.' : `You have ${remaining} activit${remaining === 1 ? 'y' : 'ies'} left to complete this week.`}
          </p>
          <p className="mt-2 text-sm text-[#475569]">
            {qualified ? 'You now have a star on the weekly leaderboard.' : 'Finish any 5 weekly activities to get a star on the weekly leaderboard.'}
          </p>
        </div>

        {!qualified && remainingItems.length > 0 ? (
          <div className="space-y-3">
            {remainingItems.map((item) => {
              const Icon = item.icon;
              const external = item.href.startsWith('http');
              const content = (
                <div className="flex items-center justify-between rounded-xl border border-[#c4b5fd]/30 bg-white px-4 py-3">
                  <div className="flex items-center gap-3 text-[#1e1b4b]">
                    <Icon size={18} />
                    <span className="font-semibold">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-[#7c3aed]">Open →</span>
                </div>
              );
              return external ? (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                  {content}
                </a>
              ) : (
                <Link key={item.label} href={item.href} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}