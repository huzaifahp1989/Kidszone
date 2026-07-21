'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookHeart, CheckCircle2, Compass, Shuffle, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';

type Habit = {
  key: string;
  label: string;
  description: string;
};

type Challenge = {
  id: string;
  title: string;
  description: string;
  href: string;
  points: number;
};

type Ayah = {
  text: string;
  reference: string;
  reflection: string;
};

const HABITS: Habit[] = [
  {
    key: 'bismillah-before-study',
    label: 'Say Bismillah before learning',
    description: 'Start your study session with Allah\'s name.',
  },
  {
    key: 'help-at-home',
    label: 'Help at home with one task',
    description: 'Serve your family with a cheerful heart.',
  },
  {
    key: 'dua-for-parents',
    label: 'Make dua for parents',
    description: 'Ask Allah to bless and forgive your parents.',
  },
  {
    key: 'smile-at-someone',
    label: 'Smile at someone',
    description: 'A smile is sadaqah — brighten someone\'s day.',
  },
  {
    key: 'share-food',
    label: 'Share food or a drink',
    description: 'Give a little of what you love for Allah\'s sake.',
  },
  {
    key: 'short-surah',
    label: 'Recite a short surah',
    description: 'Read Al-Ikhlas, Al-Falaq, or An-Nas with care.',
  },
  {
    key: 'thank-someone',
    label: 'Say jazakAllah khair',
    description: 'Thank a parent, teacher, or friend today.',
  },
  {
    key: 'tidy-space',
    label: 'Tidy your learning space',
    description: 'Cleanliness is part of faith — prepare a calm place to learn.',
  },
];

const CHALLENGES: Challenge[] = [
  {
    id: 'quiz-starter',
    title: 'Quiz Starter Sprint',
    description: 'Complete the daily quiz and score at least 70%.',
    href: '/quiz',
    points: 20,
  },
  {
    id: 'word-hunt',
    title: 'Word Hunt Explorer',
    description: 'Play one Islamic word game and find 5 words.',
    href: '/games',
    points: 25,
  },
  {
    id: 'durood-focus',
    title: 'Durood Focus Minute',
    description: 'Log today\'s Durood and maintain your streak.',
    href: '/pledge',
    points: 15,
  },
  {
    id: 'leaderboard-climb',
    title: 'Leaderboard Climb',
    description: 'Earn points from any activity and check your rank.',
    href: '/leaderboard',
    points: 30,
  },
  {
    id: 'sadaqah-log',
    title: 'Log Your Sadaqah',
    description: 'Record a kind act or charity and climb the Sadaqah Leaderboard.',
    href: '/donations',
    points: 20,
  },
  {
    id: 'bring-a-friend',
    title: 'Bring a Friend',
    description: 'Share your invite link to help another child learn Islam.',
    href: '/tasks',
    points: 50,
  },
  {
    id: 'kindness-act',
    title: 'Kindness Mission',
    description: 'Do one kind act at home and tick a Feature Lab habit.',
    href: '/',
    points: 15,
  },
  {
    id: 'seerah-chapter',
    title: 'Seerah Story Time',
    description: 'Read one Seerah chapter and learn about the Prophet ﷺ.',
    href: '/seerah',
    points: 25,
  },
  {
    id: 'memory-match',
    title: 'Memory Match Round',
    description: 'Play Memory Match and earn game points.',
    href: '/games/memory-match',
    points: 20,
  },
];

const AYAAT: Ayah[] = [
  {
    text: 'And say, "My Lord, increase me in knowledge."',
    reference: 'Surah Taha 20:114',
    reflection: 'Learn a little every day and ask Allah for understanding.',
  },
  {
    text: 'So remember Me; I will remember you.',
    reference: 'Surah Al-Baqarah 2:152',
    reflection: 'Keep your heart active with dhikr and gratitude.',
  },
  {
    text: 'Indeed, with hardship comes ease.',
    reference: 'Surah Ash-Sharh 94:6',
    reflection: 'Stay patient when learning feels hard; Allah sends ease.',
  },
  {
    text: 'And whoever relies upon Allah, then He is sufficient for him.',
    reference: 'Surah At-Talaq 65:3',
    reflection: 'Trust Allah while you work hard and stay sincere.',
  },
  {
    text: 'And speak to people good words.',
    reference: 'Surah Al-Baqarah 2:83',
    reflection: 'Kind words are a powerful form of worship.',
  },
];

function getTodayKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDeterministicIndex(seed: string, length: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % length;
}

function getIsoWeekNumber(date = new Date()): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const WEEKLY_THEMES = [
  {
    id: 'quiz-week',
    title: 'Quiz Week',
    emoji: '🧠',
    missionId: 'quiz-starter',
    bonusCopy: 'This week is Quiz Week! Complete the daily quiz and try a prophet story quiz for extra learning.',
    href: '/quiz',
    accent: 'from-violet-600 to-indigo-600',
  },
  {
    id: 'salah-week',
    title: 'Salah Week',
    emoji: '🕌',
    missionId: 'durood-focus',
    bonusCopy: 'Salah Week — log your prayers and play Salah Steps to learn the order of the five daily salah.',
    href: '/salah',
    accent: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'quran-week',
    title: 'Quran Week',
    emoji: '📖',
    missionId: 'word-hunt',
    bonusCopy: 'Quran Week — read Juz Amma, play Quran Match, or try a word hunt to grow your Quranic knowledge.',
    href: '/quran/learn',
    accent: 'from-purple-600 to-violet-600',
  },
  {
    id: 'kindness-week',
    title: 'Kindness Week',
    emoji: '💛',
    missionId: 'kindness-act',
    bonusCopy: 'Kindness Week — smile, help at home, and tick Feature Lab good deeds every day.',
    href: '/',
    accent: 'from-amber-500 to-orange-600',
  },
  {
    id: 'seerah-week',
    title: 'Seerah Week',
    emoji: '🌙',
    missionId: 'seerah-chapter',
    bonusCopy: 'Seerah Week — read a chapter about the Prophet ﷺ and share one lesson with your family.',
    href: '/seerah',
    accent: 'from-sky-600 to-blue-700',
  },
  {
    id: 'charity-week',
    title: 'Charity Week',
    emoji: '🪙',
    missionId: 'sadaqah-log',
    bonusCopy: 'Charity Week — log sadaqah, share food, or ask a parent to help you give for Allah\'s sake.',
    href: '/donations',
    accent: 'from-rose-500 to-pink-600',
  },
] as const;

function getWeeklyTheme() {
  const week = getIsoWeekNumber();
  return WEEKLY_THEMES[week % WEEKLY_THEMES.length];
}

export default function KidsZoneFeatureLab() {
  const { user } = useAuth();
  const dayKey = useMemo(getTodayKey, []);
  const todayIso = useMemo(getTodayIsoDate, []);
  const storageKey = useMemo(() => `kidszone-habit-checks:${dayKey}`, [dayKey]);
  const challengeStorageKey = useMemo(() => `kidszone-challenge-roll:${dayKey}`, [dayKey]);
  const [loading, setLoading] = useState(false);

  const [checkedHabits, setCheckedHabits] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') {
      return {};
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [challengeRoll, setChallengeRoll] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = window.localStorage.getItem(challengeStorageKey);
      return raw ? Number(raw) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const ayah = useMemo(() => {
    const idx = getDeterministicIndex(dayKey, AYAAT.length);
    return AYAAT[idx];
  }, [dayKey]);

  const challenge = useMemo(() => {
    const theme = getWeeklyTheme();
    const themed = CHALLENGES.find((c) => c.id === theme.missionId);
    const idx = (getDeterministicIndex(dayKey, CHALLENGES.length) + challengeRoll) % CHALLENGES.length;
    return themed ?? CHALLENGES[idx];
  }, [challengeRoll, dayKey]);

  const weeklyTheme = useMemo(() => getWeeklyTheme(), []);

  const completedHabits = useMemo(
    () => HABITS.filter((habit) => checkedHabits[habit.key]).length,
    [checkedHabits]
  );

  const habitPercent = useMemo(
    () => Math.round((completedHabits / HABITS.length) * 100),
    [completedHabits]
  );

  const persistRemote = useCallback(async (payload: { goodDeeds?: string[]; challengeRoll?: number; challengeId?: string }) => {
    if (!user?.id) return;
    try {
      await authJsonFetch('/api/kids-zone/feature-lab', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          date: todayIso,
          ...payload,
        }),
      });
    } catch {
      // Ignore transient save failures; user can continue using the page.
    }
  }, [todayIso, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let active = true;
    const loadRemote = async () => {
      setLoading(true);
      try {
        const headers = await getAuthFetchHeaders();
        const res = await fetch(`/api/kids-zone/feature-lab?userId=${encodeURIComponent(user.id)}&date=${encodeURIComponent(todayIso)}`, {
          cache: 'no-store',
          headers,
        });
        const data = await res.json();
        if (!res.ok || !active) return;

        const goodDeeds = Array.isArray(data?.data?.goodDeeds) ? data.data.goodDeeds as string[] : [];
        const nextChecked = Object.fromEntries(goodDeeds.map((key) => [key, true]));
        setCheckedHabits(nextChecked);

        const nextRoll = Number(data?.data?.challengeRoll || 0);
        setChallengeRoll(nextRoll);
      } catch {
        // Keep local/default state when remote load fails.
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRemote();

    return () => {
      active = false;
    };
  }, [todayIso, user?.id]);

  const toggleHabit = (key: string) => {
    setCheckedHabits((current) => {
      const next = { ...current, [key]: !current[key] };
      const nextGoodDeeds = Object.keys(next).filter((item) => next[item]);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore localStorage errors in private mode.
      }
      void persistRemote({
        goodDeeds: nextGoodDeeds,
        challengeRoll,
        challengeId: challenge.id,
      });
      return next;
    });
  };

  const rollChallenge = () => {
    setChallengeRoll((value) => {
      const next = value + 1;
      try {
        window.localStorage.setItem(challengeStorageKey, String(next));
      } catch {
        // Ignore localStorage errors in private mode.
      }

      const predictedChallenge = CHALLENGES[
        (getDeterministicIndex(dayKey, CHALLENGES.length) + next) % CHALLENGES.length
      ];
      const goodDeeds = Object.keys(checkedHabits).filter((item) => checkedHabits[item]);
      void persistRemote({
        goodDeeds,
        challengeRoll: next,
        challengeId: predictedChallenge.id,
      });
      return next;
    });
  };

  return (
    <section className="space-y-4 stagger-in">
      <article className={`rounded-2xl border border-white/20 bg-gradient-to-r ${weeklyTheme.accent} p-5 text-white shadow-lg`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Weekly theme</p>
            <h3 className="mt-1 text-2xl font-black">{weeklyTheme.emoji} {weeklyTheme.title}</h3>
            <p className="mt-2 max-w-2xl text-sm text-white/90">{weeklyTheme.bonusCopy}</p>
          </div>
          <Link
            href={weeklyTheme.href}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#134e4a] shadow hover:bg-white/90"
          >
            Start {weeklyTheme.title}
          </Link>
        </div>
      </article>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <article className="surface-card p-5 xl:col-span-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0d9488]/20 bg-[#f0fdfa] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#115e59]">
          <BookHeart size={14} /> Ayah of the Day
        </div>
        <p className="mt-4 text-lg font-bold text-[#134e4a] leading-7">{ayah.text}</p>
        <p className="mt-2 text-sm font-semibold text-[#115e59]">{ayah.reference}</p>
        <p className="mt-3 text-sm text-[#7c4b2f]">{ayah.reflection}</p>
      </article>

      <article className="surface-card p-5 xl:col-span-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#fbbf24]/30 bg-[#fffbeb] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#b45309]">
              <CheckCircle2 size={14} /> Good Deeds Tracker
            </div>
            <p className="mt-2 text-sm text-[#8c5a3c]">Small deeds today build big habits tomorrow.</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-[#134e4a]">{loading ? '...' : `${habitPercent}%`}</p>
            <p className="text-xs text-[#475569]">{loading ? 'Syncing...' : `${completedHabits}/${HABITS.length} done`}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {HABITS.map((habit) => {
            const checked = !!checkedHabits[habit.key];
            return (
              <button
                key={habit.key}
                type="button"
                onClick={() => toggleHabit(habit.key)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  checked
                    ? 'border-[#0d9488]/40 bg-[#f0fdfa]'
                    : 'border-[#5eead4]/30 bg-white hover:border-[#d6b18a]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      checked
                        ? 'border-[#0f766e] bg-[#0f766e] text-white'
                        : 'border-[#d6b18a] bg-transparent'
                    }`}
                  >
                    {checked ? <CheckCircle2 size={12} /> : null}
                  </div>
                  <div>
                    <p className="font-semibold text-[#134e4a]">{habit.label}</p>
                    <p className="text-xs text-[#475569] mt-0.5">{habit.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </article>

      <article className="surface-card p-5 xl:col-span-1 bg-gradient-to-br from-[#eef2ff] via-white to-[#f0fdfa] border border-[#c7d2fe]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0d9488]/25 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#115e59]">
          <Compass size={14} /> Mystery Challenge
        </div>

        <h3 className="mt-4 text-xl font-black text-[#134e4a]">{challenge.title}</h3>
        <p className="mt-2 text-sm text-[#0f766e]">{challenge.description}</p>

        <div className="mt-4 rounded-xl bg-white/80 border border-[#c7d2fe] px-3 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-[#0d9488]">Potential Reward</p>
          <p className="text-2xl font-black text-[#134e4a]">+{challenge.points} points</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={rollChallenge}
            className="inline-flex items-center gap-2 rounded-xl border border-[#0d9488]/30 bg-white px-4 py-2 text-sm font-bold text-[#115e59] hover:bg-[#eef2ff]"
          >
            <Shuffle size={16} /> New Challenge
          </button>

          <Link
            href={challenge.href}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0d9488] to-[#115e59] px-4 py-2 text-sm font-bold text-white shadow hover:opacity-95"
          >
            <Sparkles size={16} /> Start Challenge
          </Link>
        </div>
      </article>
    </div>
    </section>
  );
}
