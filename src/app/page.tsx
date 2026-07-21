'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { useAgeMode } from '@/lib/age-mode';
import { BookOpen, Gamepad2, Sparkles, Star, Target, Zap, Trophy, Coins } from 'lucide-react';
import DailyMissions from '@/components/DailyMissions';
import { ComeBackNudge } from '@/components/ComeBackNudge';
import { DailySurpriseBox } from '@/components/DailySurpriseBox';
import { FamilyChallengeCard } from '@/components/FamilyChallengeCard';
import { WeeklyChallengeCard } from '@/components/WeeklyChallengeCard';
import { RamadanModeCard } from '@/components/RamadanModeCard';
import { RamadanPopup } from '@/components/RamadanPopup';
import ReferralTokenHub from '@/components/ReferralTokenHub';
import KidsZoneFeatureLab from '@/components/KidsZoneFeatureLab';
import { FeatureDiscover } from '@/components/FeatureDiscover';
import { WhatsNew } from '@/components/WhatsNew';
import { ReadAloudButton } from '@/components/ReadAloudButton';
import { PointsSummaryWidget } from '@/components/PointsSummaryWidget';
import { SurveyPopup } from '@/components';
import { DailyAyahCard } from '@/components/DailyAyahCard';
import { AchievementGrid } from '@/components/AchievementGrid';
import { StreakCalendar } from '@/components/StreakCalendar';
import { getKidLevelTitle } from '@/lib/level-names';

const TIP_TEXT =
  'Try to learn something new about Islam every day, even if it is just one verse or one hadith. Little by little, you build lasting knowledge. May Allah bless your journey!';

function CourtyardArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 360"
      className={className}
      role="img"
      aria-label="Sunlit courtyard with arches"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff4d6" />
          <stop offset="55%" stopColor="#d9f5ef" />
          <stop offset="100%" stopColor="#9fe0d6" />
        </linearGradient>
        <radialGradient id="sun" cx="70%" cy="22%" r="28%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="420" height="360" fill="url(#sky)" />
      <circle cx="300" cy="78" r="110" fill="url(#sun)" />
      <circle cx="300" cy="78" r="36" fill="#fbbf24" />
      {/* Floor */}
      <path d="M0 280 H420 V360 H0 Z" fill="#0f766e" opacity="0.18" />
      <path d="M0 300 Q210 250 420 300 V360 H0 Z" fill="#134e4a" opacity="0.2" />
      {/* Arches */}
      <g fill="#fff" fillOpacity="0.55" stroke="#134e4a" strokeWidth="3">
        <path d="M40 300 V180 Q40 110 100 110 Q160 110 160 180 V300 Z" />
        <path d="M170 300 V160 Q170 80 230 80 Q290 80 290 160 V300 Z" />
        <path d="M300 300 V180 Q300 110 360 110 Q420 110 420 180 V300 Z" />
      </g>
      <g fill="#0d9488" opacity="0.35">
        <rect x="70" y="210" width="60" height="90" rx="8" />
        <rect x="200" y="190" width="60" height="110" rx="8" />
        <rect x="330" y="210" width="60" height="90" rx="8" />
      </g>
      {/* Crescent accent */}
      <path
        d="M95 95 c18 -28 52 -28 70 0 c-28 -8 -48 6 -70 0z"
        fill="#f59e0b"
        opacity="0.85"
      />
    </svg>
  );
}

function CourtyardHero({
  username,
  headline,
  support,
}: {
  username: string;
  headline: string;
  support: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <section className="hero-panel relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden">
      <div className="relative mx-auto grid min-h-[72vh] max-w-6xl items-center gap-8 px-5 py-10 md:grid-cols-2 md:px-10 md:py-14">
        <motion.div
          className="relative z-10 space-y-4 text-center md:text-left"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-heading text-5xl font-extrabold tracking-tight text-teal-950 sm:text-6xl md:text-7xl">
            Kids Zone
          </p>
          <h1 className="font-heading text-2xl font-bold text-teal-900 sm:text-3xl">{headline}</h1>
          <p className="mx-auto max-w-md text-base text-sand-700 md:mx-0 md:text-lg">
            Assalamu Alaikum, {username}. {support}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2 md:justify-start">
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-800 px-6 py-3.5 text-base font-bold text-white shadow-kids transition hover:-translate-y-0.5 hover:shadow-kids-hover"
            >
              <BookOpen size={20} /> Start Quiz
            </Link>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-teal-700/20 bg-white/80 px-6 py-3.5 text-base font-bold text-teal-950 backdrop-blur transition hover:bg-white"
            >
              <Gamepad2 size={20} /> Play Games
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="relative z-10 mx-auto w-full max-w-md md:max-w-none"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            className="overflow-hidden rounded-[2.5rem] border border-white/50 shadow-panel"
          >
            <CourtyardArt className="h-auto w-full" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  const { profile } = useAuth();
  const { isYounger } = useAgeMode();
  const user = useMemo(() => {
    const extras = (profile as unknown as { streak?: number; total_days?: number; totalDays?: number }) || {};
    return {
      username: profile?.name || 'Friend',
      points: profile?.points ?? 0,
      level: getKidLevelTitle(profile?.level ?? 1),
      streak: extras.streak ?? 0,
      totalDaysLearned: extras.total_days ?? extras.totalDays ?? 0,
    };
  }, [profile]);

  if (isYounger) {
    return (
      <div className="page-canvas">
        <SurveyPopup />
        <RamadanPopup />
        <CourtyardHero
          username={user.username}
          headline="Learn in the sunshine"
          support="Play, learn, and grow — one kind activity at a time."
        />
        <div className="page-wrap space-y-6 pt-6">
          <WhatsNew />
          <PointsSummaryWidget />
          <ComeBackNudge />
          <DailySurpriseBox />
          <RamadanModeCard />
          <div id="daily-missions">
            <DailyMissions />
          </div>
          <WeeklyChallengeCard />
          <FeatureDiscover variant="younger" />
          <DailyAyahCard compact />
          <StreakCalendar compact />
          <section className="feature-tile rounded-3xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-xl text-white">
                Tip
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h4 className="font-heading text-lg font-bold text-teal-800">Today&apos;s Tip</h4>
                  <ReadAloudButton text={TIP_TEXT} label="" size="sm" />
                </div>
                <p className="kid-text text-teal-900/80">
                  Learn one new thing about Islam every day. One verse or one hadith is a great start!
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-canvas">
      <SurveyPopup />
      <RamadanPopup />
      <CourtyardHero
        username={user.username}
        headline="Your sunlit learning courtyard"
        support="Quizzes, games, Quran, deeds, and rewards — gathered in one calm place."
      />
      <div className="page-wrap space-y-7 pt-6">
        <WhatsNew />
        <section className="grid grid-cols-2 gap-4 stagger-in md:grid-cols-4">
          {[
            { icon: Star, label: 'Points', value: user.points, color: 'text-gold-600', bg: 'bg-gold-50' },
            { icon: Target, label: 'Level', value: user.level, color: 'text-teal-700', bg: 'bg-teal-50' },
            { icon: Zap, label: 'Streak', value: `${user.streak || 0} days`, color: 'text-coral-600', bg: 'bg-coral-50' },
            {
              icon: Trophy,
              label: 'Days Learning',
              value: user.totalDaysLearned || 0,
              color: 'text-teal-600',
              bg: 'bg-teal-50',
            },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} stat-pill p-5`}>
              <div className="flex items-center gap-3">
                <div className={`rounded-xl bg-white p-2 ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-sand-900">{stat.value}</p>
                  <p className="text-sm text-sand-600">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <PointsSummaryWidget />
        <ComeBackNudge />
        <DailySurpriseBox />
        <FamilyChallengeCard />
        <RamadanModeCard />
        <div id="daily-missions">
          <DailyMissions />
        </div>
        <WeeklyChallengeCard />
        <FeatureDiscover variant="older" />
        <DailyAyahCard />
        <AchievementGrid compact />
        <ReferralTokenHub />
        <KidsZoneFeatureLab />

        <section className="feature-tile rounded-3xl p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-xl bg-gold-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-gold-800">
                <Sparkles size={14} /> Monthly Featured Quiz
              </div>
              <h2 className="mt-3 font-heading text-2xl font-bold text-teal-950 md:text-3xl">
                Masjid Al-Aqsa Quiz Competition
              </h2>
              <p className="mt-2 text-sm leading-6 text-sand-700 md:text-base">
                This month&apos;s featured contest is a written Islamic quiz on Masjid Al-Aqsa. Submit once, wait for
                admin review, and winners will receive cash prizes at the end of the month.
              </p>
            </div>
            <Link
              href="/competitions/masjid-al-aqsa"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-800 px-5 py-3 text-sm font-bold text-white shadow-kids transition hover:from-teal-500 hover:to-teal-700"
            >
              <Trophy size={18} /> Enter Quiz
            </Link>
          </div>
        </section>

        <section className="feature-tile rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-600 font-bold text-white">
              Tip
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h4 className="font-heading font-bold text-teal-800">Learning Tip</h4>
                <ReadAloudButton text={TIP_TEXT} label="" size="sm" />
              </div>
              <p className="text-sand-700">
                Try to learn something new about Islam every day, even if it&apos;s just one verse or one hadith.
                Consistency is the key to building lasting knowledge. May Allah bless your journey!
              </p>
            </div>
          </div>
        </section>

        <p className="pb-2 text-center text-sm text-sand-600">
          <Link href="/donations" className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:underline">
            <Coins size={14} /> Kids Sadaqah
          </Link>
        </p>
      </div>
    </div>
  );
}
