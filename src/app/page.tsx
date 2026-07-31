'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAgeMode } from '@/lib/age-mode';
import { BookOpen, Gamepad2, Sparkles, Star, Target, Zap, Trophy, Coins, ChevronRight, CheckCircle2, Mic, Bell, Clock } from 'lucide-react';
import DailyMissions from '@/components/DailyMissions';
import { ComeBackNudge } from '@/components/ComeBackNudge';
import { WeeklyChallengeCard } from '@/components/WeeklyChallengeCard';
import { RamadanModeCard } from '@/components/RamadanModeCard';
import { RamadanPopup } from '@/components/RamadanPopup';
import ReferralTokenHub from '@/components/ReferralTokenHub';
import KidsZoneFeatureLab from '@/components/KidsZoneFeatureLab';
import { FeatureDiscover } from '@/components/FeatureDiscover';
import { WhatsNew } from '@/components/WhatsNew';
import { Mascot } from '@/components/Mascot';
import { ReadAloudButton } from '@/components/ReadAloudButton';
import { PointsSummaryWidget } from '@/components/PointsSummaryWidget';
import { SurveyPopup, SurveyBanner } from '@/components';
import { QUIZ_TOPICS } from '@/lib/quiz-topics';
import { DailyAyahCard } from '@/components/DailyAyahCard';
import { AchievementGrid } from '@/components/AchievementGrid';
import { StreakCalendar } from '@/components/StreakCalendar';
import { getKidLevelTitle } from '@/lib/level-names';
import { RecordAndEarnBanner } from '@/components/RecordAndEarnBanner';
import { EarnMorePointsLinks } from '@/components/EarnMorePointsLinks';
import { DailyTasksBanner } from '@/components/DailyTasksBanner';

const TIP_TEXT =
  'Try to learn something new about Islam every day, even if it is just one verse or one hadith. Little by little, you build lasting knowledge. May Allah bless your journey!';

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

  const progressBlock = <PointsSummaryWidget />;

  // ---------------------------------------------------------------------------
  // Younger mode: brand-first, visual, low-text.
  // ---------------------------------------------------------------------------
  if (isYounger) {
    return (
      <div className="page-canvas">
        <SurveyPopup />
        <RamadanPopup />
        <div className="page-wrap space-y-6">
          <WhatsNew />
          <RecordAndEarnBanner />
          <section className="feature-tile rounded-3xl border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-violet-800">
                  <Bell size={14} /> Reminders
                </div>
                <h3 className="mt-3 text-2xl font-black text-violet-950">Set your daily alarms</h3>
                <p className="mt-2 text-sm text-violet-900/80">
                  Get adhan reminders, daily quiz alerts, and activity nudges — even when the app is closed.
                </p>
              </div>
              <Link
                href="/reminders"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-violet-500"
              >
                <Clock size={16} /> Set Reminders
              </Link>
            </div>
          </section>
          <section className="feature-tile rounded-3xl border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-800">
                  <Sparkles size={14} /> August 2026 Quiz
                </div>
                <h3 className="mt-3 text-2xl font-black text-amber-950">Manual Review Islamic Quiz</h3>
                <p className="mt-2 text-sm text-amber-900/80">
                  40 fun questions across 8 themes! Write your answers and a real admin reads them. Try your best and earn points!
                </p>
              </div>
              <Link
                href="/quiz-challenge/aug-2026-mixed"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:from-amber-600 hover:to-orange-600"
              >
                <Trophy size={16} /> Try the Quiz!
              </Link>
            </div>
          </section>
          <section className="feature-tile rounded-3xl border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
                  <CheckCircle2 size={14} /> Approved Recordings
                </div>
                <h3 className="mt-3 text-2xl font-black text-emerald-950">See your approved voices</h3>
                <p className="mt-2 text-sm text-emerald-900/80">
                  View approved Qur&apos;an, Nasheed, Story, and Hadith recordings in one place.
                </p>
              </div>
              <Link
                href="/approved-recordings"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-500"
              >
                <Mic size={16} /> Open Approved
              </Link>
            </div>
          </section>
          <EarnMorePointsLinks title="Earn more points today" />
          <DailyTasksBanner />
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
                </div>
                <p className="pt-1 text-sm">
                  <Link href="/donations" className="font-semibold text-teal-700 underline-offset-2 hover:underline">
                    Log sadaqah
                  </Link>
                </p>
              </div>
              <Mascot mood="wave" size="md" message={`You have ${user.points} points. Let's learn today!`} />
            </div>
          </section>

          {progressBlock}

          <section className="feature-tile rounded-3xl border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
                  <Sparkles size={14} /> Quran Listen
                </div>
                <h3 className="mt-3 text-2xl font-black text-emerald-950">Listen to Quran Daily</h3>
                <p className="mt-2 text-sm text-emerald-900/80">
                  Play short surahs or longer ones like Ya-Sin and Al-Mulk with top reciters. Complete listening and earn daily points.
                </p>
              </div>
              <Link
                href="/quran/listen"
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-500"
              >
                Open Quran Listen
              </Link>
            </div>
          </section>

          <SurveyBanner compact />

          <ComeBackNudge />

          <RamadanModeCard />

          <div id="daily-missions">
            <DailyMissions />
          </div>

          <WeeklyChallengeCard />

          <FeatureDiscover variant="younger" />

          <DailyAyahCard compact />

          <StreakCalendar compact />

          <section className="feature-tile rounded-3xl border-[#7c3aed]/20 bg-[#f5f3ff] p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]">
                <span className="text-2xl">💡</span>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h4 className="font-bold text-[#6d28d9]">Today&apos;s Tip</h4>
                  <ReadAloudButton text={TIP_TEXT} label="" size="sm" />
                </div>
                <p className="kid-text text-[#5b21b6]">
                  Learn one new thing about Islam every day. One verse or one hadith is a great start!
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Older mode: brand-first hero, then progress, then Explore Kids Zone.
  // ---------------------------------------------------------------------------
  return (
    <div className="page-canvas">
      <SurveyPopup />
      <RamadanPopup />
      <div className="page-wrap space-y-7">
        <WhatsNew />
        <RecordAndEarnBanner />
        <section className="feature-tile rounded-3xl border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-violet-800">
                <Bell size={14} /> Reminders
              </div>
              <h3 className="mt-3 text-2xl font-black text-violet-950">Set your daily alarms</h3>
              <p className="mt-2 text-sm text-violet-900/80">
                Get adhan reminders, daily quiz alerts, and activity nudges — even when the app is closed.
              </p>
            </div>
            <Link
              href="/reminders"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-violet-500"
            >
              <Clock size={16} /> Set Reminders
            </Link>
          </div>
        </section>
        <section className="feature-tile rounded-3xl border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
                <CheckCircle2 size={14} /> Approved Recordings
              </div>
              <h3 className="mt-3 text-2xl font-black text-emerald-950">Your approved recordings</h3>
              <p className="mt-2 text-sm text-emerald-900/80">
                Track approved Qur&apos;an, Nasheed, Story, and Hadith recordings in one dedicated page.
              </p>
            </div>
            <Link
              href="/approved-recordings"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-500"
            >
              <Mic size={16} /> Open Approved
            </Link>
          </div>
        </section>
        <EarnMorePointsLinks title="Earn more points today" />
        <DailyTasksBanner />
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
            { icon: Star, label: 'Points', value: user.points, color: 'text-[#f59e0b]', bg: 'bg-[#fffbeb]' },
            { icon: Target, label: 'Level', value: user.level, color: 'text-[#7c3aed]', bg: 'bg-[#f5f3ff]' },
            { icon: Zap, label: 'Streak', value: `${user.streak || 0} days`, color: 'text-[#ff6b6b]', bg: 'bg-[#fff5f5]' },
            {
              icon: Trophy,
              label: 'Days Learning',
              value: user.totalDaysLearned || 0,
              color: 'text-[#8b5cf6]',
              bg: 'bg-[#eef2ff]',
            },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} stat-pill p-5`}>
              <div className="flex items-center gap-3">
                <div className={`rounded-xl bg-white p-2 ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1e1b4b]">{stat.value}</p>
                  <p className="text-sm text-[#475569]">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <PointsSummaryWidget />

        <SurveyBanner />

        <section className="feature-tile rounded-3xl border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
                <Sparkles size={14} /> Quran Listen
              </div>
              <h3 className="mt-3 text-2xl font-black text-emerald-950">Listen to Quran Daily</h3>
              <p className="mt-2 text-sm text-emerald-900/80">
                Easily find the Quran listening page here. Choose short surahs for quick practice or longer surahs like Ya-Sin and Al-Mulk.
              </p>
            </div>
            <Link
              href="/quran/listen"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-500"
            >
              Open Quran Listen
            </Link>
          </div>
        </section>

        <section className="space-y-3 stagger-in">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-black text-[#1e1b4b]">Take a Quiz</h3>
            <Link href="/quiz" className="inline-flex items-center gap-1 text-sm font-bold text-teal-700 hover:text-teal-600">
              All Topics <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QUIZ_TOPICS.filter(t => t.group === 'general').map((topic) => (
              <Link
                key={topic.id}
                href={`/quiz?topic=${topic.id}`}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-teal-100 bg-gradient-to-br from-teal-50 to-emerald-50 p-3 transition hover:border-teal-300 hover:shadow-md"
              >
                <div className="text-2xl">{topic.emoji}</div>
                <span className="text-xs font-bold text-center text-teal-900">{topic.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <ComeBackNudge />

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

        <section className="feature-tile rounded-3xl border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-900">
                <Sparkles size={14} /> Voice Challenge
              </div>
              <h2 className="mt-3 text-2xl font-black text-amber-950 md:text-3xl">Audio Quiz</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900/80 md:text-base">
                Listen to audio questions, record your voice answers, and earn points when judges approve your entry.
                Winners can also win prizes!
              </p>
            </div>
            <Link
              href="/audio-quiz"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:from-amber-500 hover:to-orange-500"
            >
              <Trophy size={18} /> Enter &amp; Record
            </Link>
          </div>
        </section>

        <section className="feature-tile rounded-3xl border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-900">
                <Sparkles size={14} /> August 2026 Special
              </div>
              <h2 className="mt-3 text-2xl font-black text-amber-950 md:text-3xl">Manual Review Islamic Quiz</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900/80 md:text-base">
                40 unique questions across 8 themes — Seerah, Hadith, Quran, Sahabah, Prophets, Akhlaq, Fiqh, and
                General knowledge. Write full answers, a real admin reads them, and in sha Allah you earn bonus
                points for the effort you show!
              </p>
            </div>
            <Link
              href="/quiz-challenge/aug-2026-mixed"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:from-amber-600 hover:to-orange-600"
            >
              <Trophy size={18} /> Enter Manual Quiz
            </Link>
          </div>
        </section>

        <section className="feature-tile rounded-3xl border-teal-200 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-800">
                <Sparkles size={14} /> Monthly Featured Quiz
              </div>
              <h2 className="mt-3 text-2xl font-black text-[#4c1d95] md:text-3xl">Masjid Al-Aqsa Quiz Competition</h2>
              <p className="mt-2 text-sm leading-6 text-[#5b21b6] md:text-base">
                This month&apos;s featured contest is a written Islamic quiz on Masjid Al-Aqsa. Submit once, wait for
                admin review, and winners will receive cash prizes at the end of the month.
              </p>
            </div>
            <Link
              href="/competitions/masjid-al-aqsa"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:from-teal-500 hover:to-emerald-500"
            >
              <Trophy size={18} /> Enter Quiz
            </Link>
          </div>
        </section>

        <section className="feature-tile rounded-2xl border-[#7c3aed]/20 bg-[#f5f3ff] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h4 className="font-bold text-[#6d28d9]">Learning Tip</h4>
                <ReadAloudButton text={TIP_TEXT} label="" size="sm" />
              </div>
              <p className="text-[#5b21b6]">
                Try to learn something new about Islam every day, even if it&apos;s just one verse or one hadith.
                Consistency is the key to building lasting knowledge. May Allah bless your journey!
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
