'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const games = [
  {
    href: '/games/hajj/tawaf',
    icon: '🕋',
    title: 'Tawaf',
    description: 'Circle the Kaaba 7 times anti-clockwise',
    color: 'from-blue-500 to-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    badge: '7 Rounds',
  },
  {
    href: '/games/hajj/safa-marwah',
    icon: '🏃',
    title: 'Safa & Marwah',
    description: 'Walk 7 laps between the two sacred hills',
    color: 'from-emerald-500 to-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: '7 Laps',
  },
  {
    href: '/games/hajj/ibrahim-story',
    icon: '📜',
    title: 'Story of Ibrahim (AS)',
    description: 'Discover the story behind Hajj and the Kaaba',
    color: 'from-amber-500 to-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    badge: '7 Chapters',
  },
  {
    href: '/games/hajj/quran-quiz',
    icon: '🧠',
    title: 'Hajj Quiz',
    description: 'Answer questions about Hajj and its rituals',
    color: 'from-purple-500 to-purple-700',
    bg: 'bg-purple-50 border-purple-200',
    badge: '10 Questions',
  },
  {
    href: '/games/hajj/hajj-steps',
    icon: '🎯',
    title: 'Hajj Steps',
    description: 'Arrange the Hajj rituals in the correct order',
    color: 'from-rose-500 to-rose-700',
    bg: 'bg-rose-50 border-rose-200',
    badge: '6 Steps',
  },
];

export default function HajjHub() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white p-6 pb-20">
      <button
        onClick={() => router.push('/games')}
        className="flex items-center gap-2 text-blue-600 mb-6 font-bold hover:underline"
      >
        <ArrowLeft size={18} /> Back to Games
      </button>

      <div className="text-center mb-10">
        <div className="text-7xl mb-3">🕌</div>
        <h1 className="text-4xl font-black text-blue-900">Hajj Learning Games</h1>
        <p className="text-gray-500 mt-2 text-lg max-w-xl mx-auto">
          Learn the pillars of Hajj through fun interactive games. Complete all 5 challenges!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {games.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className={`${g.bg} border-2 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all block`}
          >
            <div className="text-5xl mb-3">{g.icon}</div>
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-xl font-black text-gray-800">{g.title}</h2>
              <span
                className={`text-xs font-bold bg-gradient-to-r ${g.color} text-white px-2 py-1 rounded-full ml-2 shrink-0`}
              >
                {g.badge}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">{g.description}</p>
            <div
              className={`mt-4 inline-flex items-center gap-1 bg-gradient-to-r ${g.color} text-white text-sm font-bold px-4 py-2 rounded-full`}
            >
              Play Now →
            </div>
          </Link>
        ))}
      </div>

      <div className="max-w-4xl mx-auto mt-10 bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 text-center">
        <p className="text-amber-800 font-bold">
          🌟 Complete all 5 games to become a Hajj Champion! Each completed game earns you bonus points.
        </p>
      </div>
    </div>
  );
}
