'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Navbar, Button, RewardsPosterPopup } from '@/components';
import { Trophy, Star, Award, Lock, Crown } from 'lucide-react';
import Link from 'next/link';

type MonthlyCertificate = {
  key: string;
  month: number;
  year: number;
  label: string;
  quizAttempts: number;
  pledgeLogs: number;
  pledgeRecitations: number;
  gameSessions: number;
  totalActivities: number;
  qualified: boolean;
  certificateTitle: string | null;
  certificateId: string | null;
};

export default function RewardsPage() {
  const { profile, loading, user } = useAuth() as any;
  const [mounted, setMounted] = useState(false);
  const [certificates, setCertificates] = useState<MonthlyCertificate[]>([]);
  const [certLoading, setCertLoading] = useState(false);
  const [weeklyQuizAttempts, setWeeklyQuizAttempts] = useState(0);
  const [weeklyQuizLoading, setWeeklyQuizLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadCertificates = async () => {
      if (!user?.id) {
        setCertificates([]);
        return;
      }
      setCertLoading(true);
      try {
        const res = await fetch(`/api/rewards/monthly-certificates?userId=${user.id}&months=12`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load monthly certificates');
        }
        setCertificates(Array.isArray(data?.months) ? data.months : []);
      } catch {
        setCertificates([]);
      } finally {
        setCertLoading(false);
      }
    };
    loadCertificates();
  }, [user?.id]);

  useEffect(() => {
    const loadWeeklyQuizAttempts = async () => {
      if (!user?.id) {
        setWeeklyQuizAttempts(0);
        return;
      }

      setWeeklyQuizLoading(true);
      try {
        const res = await fetch(`/api/rewards/weekly-quiz-attempts?userId=${user.id}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load weekly quiz attempts');
        }

        setWeeklyQuizAttempts(Number(data?.attempts || 0));
      } catch {
        setWeeklyQuizAttempts(0);
      } finally {
        setWeeklyQuizLoading(false);
      }
    };

    loadWeeklyQuizAttempts();
  }, [user?.id]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-islamic-light to-white">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-pulse text-xl text-islamic-blue">Loading Rewards...</div>
        </div>
      </div>
    );
  }

  const totalPoints = Number(profile?.points ?? 0);
  const badgeCount = Number(profile?.badges ?? 0);
  const streakCount = Number(profile?.streak ?? 0);
  const unlockedCertificates = certificates.filter((cert) => cert.qualified).length;
  // 1 badge every 100 points
  const pointsPerBadge = 100;
  const nextBadgePoints = (badgeCount + 1) * pointsPerBadge;
  const pointsToNext = Math.max(0, nextBadgePoints - totalPoints);
  const progressPercent = Math.min(100, ((pointsPerBadge - pointsToNext) / pointsPerBadge) * 100);

  // Level Logic
  const level = Number(profile?.level ?? 1);
  const nextLevel = level + 1;
  const badgesPerLevel = 5;
  const badgesToNextLevel = Math.max(0, (nextLevel - 1) * badgesPerLevel - badgeCount);

  const achievements = [
    {
      id: 'first-badge',
      icon: '🏅',
      name: 'Badge Hunter',
      description: 'Earn your first badge by reaching 100 points.',
      progress: Math.min(badgeCount, 1),
      target: 1,
      unit: 'badge',
      unlocked: badgeCount >= 1,
      accent: 'from-amber-100 to-yellow-50 border-amber-200',
    },
    {
      id: 'streak-7',
      icon: '🔥',
      name: 'Steady Learner',
      description: 'Build a 7 day streak by showing up consistently.',
      progress: Math.min(streakCount, 7),
      target: 7,
      unit: 'days',
      unlocked: streakCount >= 7,
      accent: 'from-rose-100 to-orange-50 border-rose-200',
    },
    {
      id: 'points-500',
      icon: '⭐',
      name: 'Point Explorer',
      description: 'Reach 500 total points across quizzes, games, and deeds.',
      progress: Math.min(totalPoints, 500),
      target: 500,
      unit: 'points',
      unlocked: totalPoints >= 500,
      accent: 'from-sky-100 to-cyan-50 border-sky-200',
    },
    {
      id: 'certificate',
      icon: '👑',
      name: 'Certificate Collector',
      description: 'Unlock a monthly certificate by staying active all month.',
      progress: Math.min(unlockedCertificates, 1),
      target: 1,
      unit: 'certificate',
      unlocked: unlockedCertificates >= 1,
      accent: 'from-violet-100 to-fuchsia-50 border-violet-200',
    },
  ];

  const waysToEarnPoints = [
    'Complete the Daily Quiz for steady points',
    'Play learning games and improve your score',
    'Keep your streak alive with daily activity',
    'Finish monthly activity goals for certificates',
    'Play every day to build points faster',
    'Complete daily missions for bonus rewards',
    'Log pledge activities consistently',
    'Recite more in pledge to boost totals',
    'Join referral and task challenges for extra points',
  ];

  // Weekly Winners (Mock or fetch from DB if available)
  // For now we will show a placeholder or fetch if we implement a public endpoint
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <RewardsPosterPopup />

        <div className="mb-6">
          <img
            src="/posters/weekly-winners-2026-05-08.png"
            alt="Weekly winners poster"
            className="w-full max-w-md mx-auto rounded-3xl shadow-lg border border-[#e5c9a3]/30"
            loading="lazy"
          />
        </div>

        <Link href="/tasks" className="mb-6 flex items-center justify-between gap-4 rounded-2xl border-2 border-[#14b8a6]/40 bg-gradient-to-r from-[#f0fdfa] to-[#ecfdf5] px-5 py-4 shadow-sm hover:border-[#14b8a6]/70 hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <p className="font-extrabold text-[#0f766e] text-base md:text-lg">Check the Tasks page to gain more points</p>
              <p className="text-sm text-[#0d9488]">Record stories, pledge Durood &amp; Zikr, play games and invite friends</p>
            </div>
          </div>
          <span className="shrink-0 rounded-xl bg-[#14b8a6] px-4 py-2 text-sm font-bold text-white">Go to Tasks →</span>
        </Link>

        <section className="mb-8 grid gap-6">
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-3xl text-white shadow-sm">
                <span>Q</span>
              </div>
              <div className="flex-1">
                <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800">
                  Qur&apos;an Competition Interest Form
                </div>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">Register Interest for the October-November 2026 Qur&apos;an Competition</h2>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 md:text-base">
                  <p>
                    Qur&apos;an Competition (Oct-Nov 2026, in sh&#257;&rsquo; All&#257;h).
                  </p>
                  <p>
                    We&apos;re currently collecting interest to plan participant numbers.
                  </p>
                  <p>
                    The event may be held at a masjid or online via Zoom, with live broadcast on Islam Media channels.
                  </p>
                  <p>
                    If your child is interested, please fill out this form.
                  </p>
                  <p className="font-semibold text-rose-700">
                    Note: Only girls under 10 are eligible.
                  </p>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLSfKlMMJIzV6wUWSQ_Kf1Zvh_ypniP31lybTFDyLAVZpQONLSw/viewform"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    Open Qur&apos;an Competition Form
                  </a>
                  <span className="text-xs font-medium text-slate-500">Complete the interest form and we&apos;ll contact you with the next update.</span>
                </div>
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-white px-4 py-4 text-sm text-slate-600">
                  The competition interest form opens in a new tab so parents can complete it directly with full access to all Google Form fields.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-3xl text-white shadow-sm">
                <span>M</span>
              </div>
              <div className="flex-1">
                <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-800">
                  Weekly Recording Form
                </div>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">Send Weekly Quran, Nasheed, Story and Islamic Recordings</h2>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 md:text-base">
                  <p>
                    Use this weekly recording form to submit Qur&apos;an recitation, nasheeds, stories, hadith and other Islamic recordings.
                  </p>
                  <p>
                    This helps us review submissions, keep track of regular participation and share suitable updates for Kids Zone activities.
                  </p>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href="https://docs.google.com/forms/d/1oEqGqPGWRw8grscd83V84vC0gFC9fesVjeyan-PzdJo/edit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
                  >
                    Open Weekly Recording Form
                  </a>
                  <span className="text-xs font-medium text-slate-500">Submit a weekly recording to stay active and share progress with the team.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            <Trophy className="text-yellow-500" size={40} />
            My Rewards & Badges
            <Trophy className="text-yellow-500" size={40} />
          </h1>
          <p className="text-lg text-gray-600">
            Earn 1 Badge for every <span className="font-bold text-islamic-blue">100 Points</span>!
          </p>
           <p className="text-md text-gray-500 mt-2">
            Every 5 Badges upgrades your <strong>Level</strong> for Prize Runner!
          </p>
        </div>

        <div className="mb-10 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 px-5 py-4 text-center">
          <p className="font-bold text-teal-800 text-base md:text-lg">New winner will be announced on 1 May 2026.</p>
          <p className="text-teal-700 mt-2 text-sm md:text-base">
            Please continue taking part every day to win prizes. The more you play every day, the more points you get.
          </p>
        </div>

        <div className="mb-10 text-center">
          <a
            href="https://chat.whatsapp.com/E7bJY8Hz5lEEDscBXKtsSM?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-[#14b8a6]/30 bg-[#f0fdfa] px-4 py-3 text-sm font-bold text-[#0d9488] hover:bg-[#ccfbf1] transition"
          >
            Join kids zone group on whatsapp to stay updated
          </a>
        </div>

        <section className="mb-12">
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-sky-50 to-white p-6">
            <h3 className="text-2xl font-bold text-gray-800">More Ways To Earn Points</h3>
            <p className="mt-2 text-sm text-gray-600">
              Keep learning every day and try different activities to grow your points faster.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {waysToEarnPoints.map((item) => (
                <div key={item} className="rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm font-semibold text-indigo-900">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              Record Quran, stories, Hadith and nasheeds to gain more points. Message on 07404644610 with your recording.
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 text-center">
            <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Total Points</div>
            <div className="text-4xl font-bold text-islamic-blue">{totalPoints}</div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 text-center">
            <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Badges Earned</div>
            <div className="text-4xl font-bold text-yellow-500">{badgeCount}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 text-center">
            <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Current Level</div>
            <div className="text-2xl font-bold text-purple-600">
              Level {level}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 text-center">
            <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Weekly Quiz Takes</div>
            <div className="text-4xl font-bold text-teal-600">{weeklyQuizLoading ? '...' : weeklyQuizAttempts}</div>
            <div className="mt-2 text-xs font-semibold text-emerald-600">
              The more you play every day, the more points you get.
            </div>
          </div>
        </div>


        {/* Next Badge Progress */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-12">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Next Badge Progress</h3>
              <p className="text-gray-500 text-sm">
                {pointsToNext} more points to reach Badge #{badgeCount + 1}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-islamic-blue">{Math.floor(progressPercent)}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 h-6 rounded-full overflow-hidden">
             <div 
              className="h-full bg-gradient-to-r from-islamic-blue to-islamic-green transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        
         {/* Next Level Progress */}
         <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-12">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Next Level Progress</h3>
              <p className="text-gray-500 text-sm">
                {badgesToNextLevel} more badges to reach Level {nextLevel}
              </p>
            </div>
            <div className="text-right">
               {/* 5 badges per level. Current progress = (badges % 5) / 5 */}
              <span className="text-2xl font-bold text-purple-600">{Math.floor(((badgeCount % badgesPerLevel) / badgesPerLevel) * 100)}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 h-6 rounded-full overflow-hidden">
             <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${((badgeCount % badgesPerLevel) / badgesPerLevel) * 100}%` }}
            />
          </div>
        </div>

        {/* Badges Grid */}
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Award className="text-rose-500" />
          Your Collection
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {/* Render Earned Badges */}
          {Array.from({ length: badgeCount }).map((_, i) => (
            <div key={`badge-${i}`} className="aspect-square bg-gradient-to-br from-yellow-100 to-amber-50 rounded-2xl flex flex-col items-center justify-center p-4 border-2 border-yellow-200 shadow-sm hover:shadow-md transition-shadow group">
              <div className="bg-yellow-400 text-white w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform">
                <Star size={32} fill="currentColor" />
              </div>
              <span className="font-bold text-amber-800">Badge #{i + 1}</span>
              <span className="text-xs text-amber-600 mt-1">Unlocked</span>
            </div>
          ))}

          {/* Render Next Locked Badge */}
          <div className="aspect-square bg-gray-50 rounded-2xl flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 opacity-70">
            <div className="bg-gray-200 text-gray-400 w-16 h-16 rounded-full flex items-center justify-center mb-3">
              <Lock size={32} />
            </div>
            <span className="font-bold text-gray-500">Badge #{badgeCount + 1}</span>
            <span className="text-xs text-gray-400 mt-1">{nextBadgePoints} Points</span>
          </div>

          {/* Placeholders */}
          {Array.from({ length: Math.max(0, 4 - (badgeCount % 5)) }).map((_, i) => (
            <div key={`placeholder-${i}`} className="aspect-square bg-transparent rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-gray-50"></div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/quiz">
            <Button size="lg" className="bg-islamic-blue hover:bg-islamic-blue/90 text-white px-8">
              Earn More Points in Quiz
            </Button>
          </Link>
        </div>

        <section className="mt-16">
          <div className="flex items-center gap-2 mb-6">
            <Award className="text-rose-500" />
            <h3 className="text-2xl font-bold text-gray-800">Milestone Achievements</h3>
          </div>
          <p className="text-sm text-gray-600 mb-5">
            These named milestones make progress easier for kids to understand than points alone.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => {
              const percent = Math.min(100, Math.round((achievement.progress / achievement.target) * 100));

              return (
                <div
                  key={achievement.id}
                  className={`rounded-2xl border bg-gradient-to-br ${achievement.accent} p-5 shadow-sm`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-2xl">
                        {achievement.icon}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">{achievement.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        achievement.unlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-500 border border-gray-200'
                      }`}
                    >
                      {achievement.unlocked ? 'Unlocked' : 'In Progress'}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                      <span>{achievement.progress} / {achievement.target} {achievement.unit}</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full bg-white/80 h-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-islamic-blue to-islamic-green transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <div className="flex items-center gap-2 mb-6">
            <Crown className="text-amber-500" />
            <h3 className="text-2xl font-bold text-gray-800">Monthly Certificates</h3>
          </div>
          <p className="text-sm text-gray-600 mb-5">
            Complete 3 or more activities in a month across quizzes, games, and pledge logs to unlock a Well Done Certificate.
          </p>

          {certLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-500">Loading certificates...</div>
          ) : certificates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-500">No monthly activity yet. Start with quiz, games, and pledge to unlock your first certificate.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.key}
                  className={`rounded-2xl border p-5 transition ${
                    cert.qualified
                      ? 'bg-gradient-to-br from-amber-50 to-rose-50 border-amber-200 shadow-sm'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">{cert.label}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Quizzes: {cert.quizAttempts} | Games: {cert.gameSessions} | Pledges: {cert.pledgeLogs}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        cert.qualified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {cert.qualified ? 'Certificate Unlocked' : 'Keep Going'}
                    </span>
                  </div>

                  <div className="mt-4 text-sm text-gray-700">
                    <p>Total activities: <strong>{cert.totalActivities}</strong></p>
                    <p>Pledge recitations: <strong>{cert.pledgeRecitations}</strong></p>
                  </div>

                  <div className="mt-4">
                    {cert.qualified ? (
                      <div className="rounded-xl bg-white/80 border border-amber-200 px-4 py-3">
                        <p className="font-bold text-amber-700">Well Done Certificate</p>
                        <p className="text-xs text-amber-700/80 mt-1">Month: {cert.label}</p>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">Need at least {Math.max(0, 3 - cert.totalActivities)} more activity this month.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
