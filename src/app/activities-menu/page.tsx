import Link from 'next/link';
import {
  ACTIVITY_BONUS_POINTS,
  AUDIO_COMPETITION_APPROVED_POINTS,
  DAILY_EARNING_PLAN,
  POINTS_DAILY_CAP,
  RECORDING_APPROVED_POINTS,
} from '@/lib/points-policy';
import { DailyTasksBanner } from '@/components/DailyTasksBanner';

const QURAN_LISTEN_POINTS = 25;

const DAILY_ACTIVITY_STYLE: Record<string, { icon: string; card: string; badge: string }> = {
  quiz: {
    icon: '🧠',
    card: 'border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-rose-50 hover:border-fuchsia-300',
    badge: 'bg-fuchsia-100 text-fuchsia-800',
  },
  game: {
    icon: '🎮',
    card: 'border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-sky-50 hover:border-cyan-300',
    badge: 'bg-cyan-100 text-cyan-800',
  },
  story_quiz: {
    icon: '📖',
    card: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 hover:border-amber-300',
    badge: 'bg-amber-100 text-amber-800',
  },
  durood: {
    icon: '🤲',
    card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 hover:border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  zikr: {
    icon: '✨',
    card: 'border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 hover:border-indigo-300',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  hadith: {
    icon: '🕋',
    card: 'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-pink-50 hover:border-rose-300',
    badge: 'bg-rose-100 text-rose-800',
  },
  salah: {
    icon: '🕌',
    card: 'border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 hover:border-teal-300',
    badge: 'bg-teal-100 text-teal-800',
  },
};

const EXTRA_ACTIVITIES: Array<{
  title: string;
  href: string;
  note: string;
  pointsLabel: string;
  external?: boolean;
}> = [
  {
    title: 'Quran Listening Club',
    href: '/quran/listen',
    note: 'Listen at least 3 minutes, then claim your daily reward.',
    pointsLabel: `+${QURAN_LISTEN_POINTS} points`,
  },
  {
    title: 'Audio Quiz',
    href: '/audio-quiz',
    note: 'Record your answer. Points are added when approved.',
    pointsLabel: `+${AUDIO_COMPETITION_APPROVED_POINTS} points`,
  },
  {
    title: 'Recording Studio',
    href: '/studio',
    note: "Record Qur'an, stories, or nasheeds. Earn when approved.",
    pointsLabel: `+${RECORDING_APPROVED_POINTS} points`,
  },
  {
    title: 'Kids Survey',
    href: 'https://docs.google.com/forms/d/e/1FAIpQLScPwSgQimR0x2Qk8mxvQ1q_LDdAXZGqX14ZxgVLz7Y2AmA5GQ/viewform',
    note: 'Complete the survey form to claim the reward.',
    pointsLabel: '+50 points',
    external: true,
  },
];

export default function ActivitiesMenuPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-cyan-50 px-4 py-8">
      <main className="mx-auto max-w-5xl">
        <DailyTasksBanner />

        <section className="rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Activities Menu</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">Tap any activity to earn points</h1>
          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            Choose quizzes, games, and good deeds. Daily cap is <strong>{POINTS_DAILY_CAP} points</strong>.
          </p>
          <div className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 sm:text-sm">
            Every daily activity gives +{ACTIVITY_BONUS_POINTS} points
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-xl font-black text-slate-900">Daily point activities</h2>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {DAILY_EARNING_PLAN.map((activity) => {
              const style = DAILY_ACTIVITY_STYLE[activity.activity] ?? {
                icon: '⭐',
                card: 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 hover:border-violet-300',
                badge: 'bg-violet-100 text-violet-800',
              };

              return (
                <Link
                  key={activity.activity}
                  href={activity.href}
                  className={`rounded-xl border p-2 shadow-sm transition sm:p-2.5 ${style.card}`}
                >
                  <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-base shadow-sm sm:h-8 sm:w-8 sm:text-lg">
                    {style.icon}
                  </div>
                  <p className="text-center text-[11px] font-black leading-tight text-slate-900 sm:text-sm">{activity.title}</p>
                  <p className={`mt-1 rounded-full px-1.5 py-0.5 text-center text-[9px] font-black uppercase tracking-wide sm:text-[10px] ${style.badge}`}>
                    {activity.limit}x daily
                  </p>
                  <span className="mt-1.5 inline-flex w-full justify-center text-[10px] font-black text-slate-700 sm:text-xs">
                    Open
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-7">
          <h2 className="mb-3 text-xl font-black text-slate-900">Bonus and approved activities</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXTRA_ACTIVITIES.map((activity) => (
              <article key={activity.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-black text-slate-900">{activity.title}</p>
                  <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">
                    {activity.pointsLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{activity.note}</p>
                {activity.external ? (
                  <a
                    href={activity.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-sm font-bold text-violet-700 hover:underline"
                  >
                    Open activity -&gt;
                  </a>
                ) : (
                  <Link href={activity.href} className="mt-3 inline-flex text-sm font-bold text-violet-700 hover:underline">
                    Open activity -&gt;
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:p-5">
          <p className="font-bold text-violet-900">Need full rules and daily limits?</p>
          <Link href="/guide" className="mt-2 inline-flex text-sm font-bold text-violet-700 hover:underline">
            Open points guide -&gt;
          </Link>
        </section>

        {/* Daily Tasks Section */}
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-black text-slate-900">Daily Tasks</h2>
          <Link
            href="/tracker"
            className="flex items-center justify-between gap-4 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-2xl shadow">
                ✅
              </div>
              <div>
                <p className="font-black text-emerald-900 text-base">5 Daily Salah · Durood · Quran · Good Deeds</p>
                <p className="text-xs text-emerald-700 mt-0.5">Tick each task every day and earn up to <strong>40 points</strong></p>
              </div>
            </div>
            <span className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white">My Tasks →</span>
          </Link>
        </section>

        {/* Feedback Survey Section */}
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-black text-slate-900">Feedback &amp; Survey</h2>
          <Link
            href="/feedback-survey"
            className="flex items-center justify-between gap-4 rounded-2xl border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-5 py-4 shadow-sm transition hover:border-violet-400 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-2xl shadow">
                📋
              </div>
              <div>
                <p className="font-black text-violet-900 text-base">Kids Zone Feedback Survey</p>
                <p className="text-xs text-violet-700 mt-0.5">Share your thoughts, earn <strong>+50 points</strong> when approved, and enter our draw for a free personalised mug & key ring!</p>
              </div>
            </div>
            <span className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white">Take Survey →</span>
          </Link>
        </section>
      </main>
    </div>
  );
}