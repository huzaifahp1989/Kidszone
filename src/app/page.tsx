'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAgeMode } from '@/lib/age-mode';
import {
  BookOpen,
  Gamepad2,
  Sparkles,
  Star,
  Swords,
  Target,
  Zap,
  Trophy,
  Coins,
  ChevronRight,
  Mic,
  Bell,
  Palette,
  Brain,
  Languages,
  CalendarDays,
  Award,
  ListOrdered,
  Gift,
  HeartHandshake,
} from 'lucide-react';
import DailyMissions from '@/components/DailyMissions';
import { DailyDuaCard } from '@/components/DailyDuaCard';
import { SurahOfTheWeekCard } from '@/components/SurahOfTheWeekCard';
import { ComeBackNudge } from '@/components/ComeBackNudge';
import { WeeklyChallengeCard } from '@/components/WeeklyChallengeCard';
import { RamadanModeCard } from '@/components/RamadanModeCard';
import ReferralTokenHub from '@/components/ReferralTokenHub';
import KidsZoneFeatureLab from '@/components/KidsZoneFeatureLab';
import { FeatureDiscover } from '@/components/FeatureDiscover';
import { WhatsNew } from '@/components/WhatsNew';
import { Mascot } from '@/components/Mascot';
import { ReadAloudButton } from '@/components/ReadAloudButton';
import { PointsSummaryWidget } from '@/components/PointsSummaryWidget';
import { QUIZ_TOPICS } from '@/lib/quiz-topics';
import { DailyAyahCard } from '@/components/DailyAyahCard';
import { AchievementGrid } from '@/components/AchievementGrid';
import { StreakCalendar } from '@/components/StreakCalendar';
import { getKidLevelTitle } from '@/lib/level-names';
import { RecordAndEarnBanner } from '@/components/RecordAndEarnBanner';
import { EarnMorePointsLinks } from '@/components/EarnMorePointsLinks';
import { DailyTasksBanner } from '@/components/DailyTasksBanner';
import { StarsProgressCard } from '@/components/StarsProgressCard';
import { KidsChannelHome } from '@/components/KidsChannelHome';
import { ReviewPromptCard } from '@/components/ReviewPromptCard';

const TIP_TEXT =
  'Try to learn something new about Islam every day, even if it is just one verse or one hadith. Little by little, you build lasting knowledge. May Allah bless your journey!';

function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
  icon?: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
            <Icon size={16} />
          </span>
        )}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</p>
          <h2 className="text-lg font-black text-sand-900">{title}</h2>
        </div>
      </div>
      {href && linkLabel && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-teal-700 hover:text-teal-600">
          {linkLabel} <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

function TodayRail() {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-black text-sand-900">Today</h2>
        <Link href="/activities-menu" className="text-sm font-bold text-teal-700 hover:text-teal-600">
          All activities
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Link
          href="/reminders"
          className="feature-tile flex items-center gap-3 p-4 hover:border-teal-300"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <Bell size={18} />
          </span>
          <span>
            <span className="block text-sm font-bold text-sand-900">Reminders</span>
            <span className="block text-xs text-sand-600">Adhan & quiz alarms</span>
          </span>
        </Link>
        <Link
          href="/approved-recordings"
          className="feature-tile flex items-center gap-3 p-4 hover:border-teal-300"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 text-gold-700">
            <Mic size={18} />
          </span>
          <span>
            <span className="block text-sm font-bold text-sand-900">Recordings</span>
            <span className="block text-xs text-sand-600">Approved voices</span>
          </span>
        </Link>
        <Link
          href="/create"
          className="feature-tile flex items-center gap-3 p-4 hover:border-teal-300"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sand-100 text-teal-800">
            <Palette size={18} />
          </span>
          <span>
            <span className="block text-sm font-bold text-sand-900">Create & Play</span>
            <span className="block text-xs text-sand-600">Colour, draw, stories</span>
          </span>
        </Link>
      </div>
      <DailyTasksBanner />
      <EarnMorePointsLinks title="Earn more points today" />
      <RecordAndEarnBanner />
      <ReviewPromptCard compact />
    </section>
  );
}

function CompetitionsBand() {
  return (
    <section className="feature-tile border-gold-200 bg-gradient-to-br from-gold-50 via-white to-teal-50 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gold-800">
            <Trophy size={14} /> Competitions
          </p>
          <h2 className="mt-2 text-2xl font-black text-sand-900">Written quizzes & prize draws</h2>
          <p className="mt-2 text-sm text-sand-600">
            Enter Seerah and featured written competitions, or browse every open written contest in one hub.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/competitions/written"
            className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-teal-600"
          >
            Written hub
          </Link>
          <Link
            href="/competitions/rabi-ul-awwal"
            className="inline-flex items-center justify-center rounded-2xl border border-teal-200 bg-white px-5 py-3 text-sm font-bold text-teal-800 hover:bg-teal-50"
          >
            Seerah quiz
          </Link>
        </div>
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
        <div className="page-wrap space-y-6">
          <section className="hero-panel stagger-in">
            <div className="relative flex flex-col items-center gap-5 px-5 py-8 text-center md:flex-row md:items-center md:justify-between md:text-left">
              <div className="space-y-3">
                <p className="font-heading text-4xl font-extrabold tracking-tight text-teal-900 md:text-5xl">
                  Kids Zone
                </p>
                <p className="text-lg font-semibold text-sand-800">
                  Assalamu Alaikum, <span className="text-gradient-warm">{user.username}</span>!
                </p>
                <p className="mx-auto max-w-md text-sm text-sand-600 md:mx-0">
                  Play, learn, and grow — one fun activity at a time.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-1 md:justify-start">
                  <Link
                    href="/quiz"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-800 px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <BookOpen size={20} /> Start Quiz
                  </Link>
                  <Link
                    href="/games"
                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-teal-200 bg-white px-6 py-3.5 text-base font-bold text-sand-900 transition hover:bg-teal-50"
                  >
                    <Gamepad2 size={20} /> Play Games
                  </Link>
                  <Link
                    href="/quran-duel"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-sky-500 to-emerald-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-100 transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <Swords size={20} /> Challenge Friend
                  </Link>
                </div>
              </div>
              <Mascot mood="wave" size="md" message={`You have ${user.points} points. Let's learn today!`} />
            </div>
          </section>

          <Link
            href="/monthly-winners"
            className="feature-tile flex items-center justify-between gap-4 border border-amber-200 bg-amber-50/70 p-5 transition hover:bg-amber-50"
          >
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Celebrate our community</span>
              <span className="mt-1 block text-lg font-black text-sand-900">Check out our monthly winners</span>
              <span className="mt-1 block text-sm text-sand-600">See children taking part in our monthly competitions.</span>
            </span>
            <Trophy size={24} className="shrink-0 text-amber-600" />
          </Link>

          <TodayRail />
          <PointsSummaryWidget />
          <Link
            href="/points-calendar"
            className="feature-tile flex items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 transition hover:bg-teal-50"
          >
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Points calendar</span>
              <span className="mt-1 block text-base font-black text-sand-900">See daily, monthly &amp; yearly points</span>
            </span>
            <span className="text-sm font-bold text-teal-800">Open →</span>
          </Link>
          <StarsProgressCard compact />
          <KidsChannelHome compact />

          <div id="daily-missions">
            <DailyMissions />
          </div>
          <DailyDuaCard />
          <SurahOfTheWeekCard />
          <WeeklyChallengeCard />
          <KidsZoneFeatureLab />
          <AchievementGrid compact />

          <section className="feature-tile p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Quran Listen</p>
                <h3 className="mt-1 text-xl font-black text-sand-900">Listen to Quran Daily</h3>
                <p className="mt-1 text-sm text-sand-600">Listen with 200+ reciters and earn points toward rewards.</p>
              </div>
              <Link
                href="/quran/listen"
                className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-600"
              >
                Listen &amp; earn
              </Link>
            </div>
          </section>

          <FeatureDiscover variant="younger" />
          <DailyAyahCard compact />
          <StreakCalendar compact />
          <ComeBackNudge />
          <RamadanModeCard />
          <WhatsNew />
          <CompetitionsBand />

          <section className="feature-tile border-teal-200 bg-teal-50/60 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h4 className="font-bold text-teal-900">Today&apos;s Tip</h4>
                  <ReadAloudButton text={TIP_TEXT} label="" size="sm" />
                </div>
                <p className="kid-text text-sand-700">
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
      <div className="page-wrap space-y-7">
        <section className="hero-panel stagger-in">
          <div className="relative px-6 py-9 md:px-10 md:py-11">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl space-y-3">
                <p className="font-heading text-4xl font-extrabold tracking-tight text-teal-900 md:text-5xl lg:text-6xl">
                  Kids Zone
                </p>
                <p className="text-lg font-semibold text-sand-800 md:text-xl">
                  Assalamu Alaikum, <span className="text-gradient-warm">{user.username}</span>
                </p>
                <p className="max-w-lg text-base text-sand-600 md:text-lg">
                  Your Islamic learning hub — quizzes, games, Quran, deeds, and rewards in one place.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Link
                    href="/quiz"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-800 px-6 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <BookOpen size={20} />
                    Daily Quiz
                  </Link>
                  <Link
                    href="/games"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-teal-200 bg-white px-6 py-3 font-bold text-sand-900 transition hover:bg-teal-50"
                  >
                    <Gamepad2 size={20} />
                    Play Games
                  </Link>
                  <Link
                      href="/quran-duel"
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-sky-500 to-emerald-500 px-6 py-3 font-bold text-white shadow-lg shadow-sky-100 transition hover:-translate-y-0.5 hover:shadow-xl"
                    >
                      <Swords size={20} />
                      Quran Duel 1v1
                    </Link>
                </div>
                <p className="text-sm text-sand-600">
                  <Link
                    href="/donations"
                    className="inline-flex items-center gap-1.5 font-semibold text-teal-700 underline-offset-2 hover:underline"
                  >
                    <Coins size={14} />
                    Kids Sadaqah
                  </Link>
                </p>
              </div>
              <div className="flex-shrink-0 self-center">
                <Mascot mood="happy" size="md" />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 stagger-in md:grid-cols-4">
          {[
            { icon: Star, label: 'Points', value: user.points, color: 'text-gold-600', bg: 'bg-gold-50' },
            { icon: Target, label: 'Level', value: user.level, color: 'text-teal-700', bg: 'bg-teal-50' },
            { icon: Zap, label: 'Streak', value: `${user.streak || 0} days`, color: 'text-coral-500', bg: 'bg-coral-50' },
            {
              icon: Trophy,
              label: 'Days Learning',
              value: user.totalDaysLearned || 0,
              color: 'text-teal-800',
              bg: 'bg-sand-100',
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

        <TodayRail />
        <PointsSummaryWidget />
        <Link
          href="/points-calendar"
          className="feature-tile flex items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 transition hover:bg-teal-50"
        >
          <span>
            <span className="block text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Points calendar</span>
            <span className="mt-1 block text-base font-black text-sand-900">See daily, monthly &amp; yearly points</span>
          </span>
          <span className="text-sm font-bold text-teal-800">Open →</span>
        </Link>
        <StarsProgressCard />
        <KidsChannelHome />

        <SectionHeading eyebrow="Learn" title="Islamic Quizzes" href="/quiz" linkLabel="All Topics" icon={Brain} />
        <section className="space-y-3 stagger-in">
          <div className="grid grid-cols-3 gap-2">
            {QUIZ_TOPICS.filter((t) => t.group === 'general').map((topic) => (
              <Link
                key={topic.id}
                href={`/quiz?topic=${topic.id}`}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-teal-100 bg-gradient-to-br from-teal-50 to-sand-50 p-3 transition hover:border-teal-300 hover:shadow-md"
              >
                <div className="text-2xl">{topic.emoji}</div>
                <span className="text-center text-xs font-bold text-teal-900">{topic.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <SectionHeading eyebrow="Play" title="Islamic Games" href="/games" linkLabel="All Games" icon={Gamepad2} />
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/games/memory-match', emoji: '🧠', label: 'Memory Match' },
            { href: '/games/word-search', emoji: '🔍', label: 'Word Search' },
            { href: '/games/wudu-steps', emoji: '🚿', label: 'Wudu Steps' },
            { href: '/games', emoji: '🎮', label: 'More Games' },
          ].map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="feature-tile flex flex-col items-center gap-2 p-4 text-center"
            >
              <span className="text-3xl">{g.emoji}</span>
              <span className="text-sm font-bold text-sand-900">{g.label}</span>
            </Link>
          ))}
        </section>

        <SectionHeading eyebrow="Language" title="Arabic Learning" href="/arabic" linkLabel="Open Arabic" icon={Languages} />
        <section className="feature-tile flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-5">
          <div>
            <h3 className="text-lg font-black text-sand-900">Learn the Arabic alphabet &amp; words</h3>
            <p className="mt-1 text-sm text-sand-600">Arabic letters, words, and matching activities.</p>
          </div>
          <Link href="/arabic" className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-600">
            Start Arabic
          </Link>
        </section>

        <SectionHeading eyebrow="Daily" title="Daily Duas &amp; Dhikr" href="/hadith" linkLabel="Duas" icon={HeartHandshake} />
        <DailyDuaCard />

        <SectionHeading eyebrow="Quran" title="Quran Learning" href="/quran" linkLabel="Open Quran" icon={BookOpen} />
        <SurahOfTheWeekCard />

        <SectionHeading eyebrow="Weekly" title="Weekly Activities" href="/activities" linkLabel="All Activities" icon={CalendarDays} />
        <WeeklyChallengeCard />

        <SectionHeading eyebrow="Awards" title="My Achievements" href="/profile" linkLabel="Profile" icon={Award} />
        <AchievementGrid compact />

        <SectionHeading eyebrow="Rank" title="Leaderboard" href="/leaderboard" linkLabel="View Rankings" icon={ListOrdered} />
        <section className="feature-tile flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-5">
          <div>
            <h3 className="text-lg font-black text-sand-900">See where you stand</h3>
            <p className="mt-1 text-sm text-sand-600">Weekly, monthly &amp; lifetime rankings with badges.</p>
          </div>
          <Link href="/leaderboard" className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-3 text-sm font-bold text-sand-900 shadow-md hover:from-gold-400 hover:to-gold-500">
            Open Leaderboard
          </Link>
        </section>
        <Link
          href="/monthly-winners"
          className="feature-tile flex items-center justify-between gap-4 border border-amber-200 bg-amber-50/70 p-5 transition hover:bg-amber-50"
        >
          <span>
            <span className="block text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Celebrate our community</span>
            <span className="mt-1 block text-lg font-black text-sand-900">Check out our monthly winners</span>
            <span className="mt-1 block text-sm text-sand-600">See children taking part in our monthly competitions.</span>
          </span>
          <Trophy size={24} className="shrink-0 text-amber-600" />
        </Link>

        <SectionHeading eyebrow="Rewards" title="Available Prizes" href="/rewards" linkLabel="All Prizes" icon={Gift} />
        <section className="grid gap-3 sm:grid-cols-2">
          <Link href="/rewards" className="feature-tile flex items-center gap-3 p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 text-gold-700"><Gift size={20} /></span>
            <span><span className="block text-sm font-bold text-sand-900">Prizes &amp; Rewards</span><span className="block text-xs text-sand-600">Spin wheel, vouchers, certificates</span></span>
          </Link>
          <Link href="/competitions/written" className="feature-tile flex items-center gap-3 p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700"><Trophy size={20} /></span>
            <span><span className="block text-sm font-bold text-sand-900">Competitions</span><span className="block text-xs text-sand-600">Written quizzes &amp; prize draws</span></span>
          </Link>
        </section>

        <SectionHeading eyebrow="Today" title="Today's Challenge" icon={Target} />
        <div id="daily-missions">
          <DailyMissions />
        </div>

        <KidsZoneFeatureLab />
        <ReferralTokenHub />
        <ComeBackNudge />
        <RamadanModeCard />

        <section className="feature-tile p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Quran Listen</p>
              <h3 className="mt-1 text-xl font-black text-sand-900">Listen to Quran Daily</h3>
              <p className="mt-1 text-sm text-sand-600">Listen with 200+ reciters and earn points toward rewards.</p>
            </div>
            <Link
              href="/quran/listen"
              className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-600"
            >
              Listen &amp; earn
            </Link>
          </div>
        </section>

        <section className="feature-tile border-gold-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-800">Voice Challenge</p>
              <h3 className="mt-1 text-xl font-black text-sand-900">Audio Quiz</h3>
              <p className="mt-1 text-sm text-sand-600">Record voice answers and earn points when approved.</p>
            </div>
            <Link
              href="/audio-quiz"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-3 text-sm font-bold text-sand-900 shadow-md hover:from-gold-400 hover:to-gold-500"
            >
              <Mic size={16} /> Enter &amp; Record
            </Link>
          </div>
        </section>

        <section className="feature-tile border-emerald-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">Story Challenge</p>
              <h3 className="mt-1 text-xl font-black text-sand-900">✍️ Islamic Story Writer</h3>
              <p className="mt-1 text-sm text-sand-600">Write your own Islamic story and earn points when approved.</p>
            </div>
            <Link
              href="/story-writer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-500"
            >
              Start writing
            </Link>
          </div>
        </section>

        <WhatsNew />
        <CompetitionsBand />

        <section className="feature-tile border-teal-200 bg-teal-50/50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h4 className="font-bold text-teal-900">Learning Tip</h4>
                <ReadAloudButton text={TIP_TEXT} label="" size="sm" />
              </div>
              <p className="text-sand-700">
                Try to learn something new about Islam every day, even if it&apos;s just one verse or one hadith.
                Consistency builds lasting knowledge. May Allah bless your journey!
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
