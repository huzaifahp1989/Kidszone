'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { awardPoints as awardPointsRpc } from '@/lib/points-service';
import { useAuth } from '@/lib/auth-context';

interface Question {
  q: string;
  options: string[];
  correct: number;
  fact: string;
}

const questions: Question[] = [
  {
    q: 'In which Islamic month is Hajj performed?',
    options: ['Ramadan', 'Muharram', 'Dhul Hijjah', 'Safar'],
    correct: 2,
    fact: 'Hajj takes place in the month of Dhul Hijjah, the 12th month of the Islamic calendar.',
  },
  {
    q: 'How many times do you walk around the Kaaba in Tawaf?',
    options: ['5 times', '6 times', '8 times', '7 times'],
    correct: 3,
    fact: 'Tawaf consists of 7 anti-clockwise circles around the Kaaba, starting and ending at the Black Stone.',
  },
  {
    q: 'Which hill do you start Sa\'i from?',
    options: ['Marwah', 'Arafat', 'Safa', 'Mina'],
    correct: 2,
    fact: 'Sa\'i begins at the hill of Safa, following in the footsteps of Hagar (RA) who first ran to Safa searching for water.',
  },
  {
    q: 'Where must pilgrims stand on the 9th of Dhul Hijjah?',
    options: ['Mina', 'Muzdalifah', 'Zamzam', 'The Plain of Arafat'],
    correct: 3,
    fact: 'Standing on the Plain of Arafat is the most important pillar of Hajj. The Prophet ﷺ said: "Hajj IS Arafat."',
  },
  {
    q: 'What do pilgrims wear as Ihram?',
    options: ['Colourful traditional dress', 'Two plain white sheets', 'Green robes', 'Black cloaks'],
    correct: 1,
    fact: 'Male pilgrims wear two plain white unsewn sheets (Ihram). This shows equality — rich and poor look the same before Allah.',
  },
  {
    q: 'What is the name of the blessed water well in Makkah?',
    options: ['Al-Kawthar', 'Zamzam', 'Euphrates', 'River Jordan'],
    correct: 1,
    fact: 'The Zamzam well miraculously appeared when baby Ismail (AS) struck his heel on the ground. It has never dried up in thousands of years!',
  },
  {
    q: 'Who rebuilt the Kaaba with his son Ismail (AS)?',
    options: ['Prophet Nuh (AS)', 'Prophet Musa (AS)', 'Prophet Dawud (AS)', 'Prophet Ibrahim (AS)'],
    correct: 3,
    fact: 'Prophet Ibrahim (AS) and his son Ismail (AS) rebuilt the Kaaba together while reciting: "Our Lord, accept this from us!"',
  },
  {
    q: 'What is the name of the sacred black stone on the Kaaba?',
    options: ['Maqam Ibrahim', 'Hajar al-Aswad', 'Kiswa Stone', 'Safa Stone'],
    correct: 1,
    fact: 'The Hajar al-Aswad (Black Stone) is placed in the eastern corner of the Kaaba. Pilgrims try to touch or point to it during Tawaf.',
  },
  {
    q: 'Hajj is which number among the Five Pillars of Islam?',
    options: ['2nd Pillar', '3rd Pillar', '4th Pillar', '5th Pillar'],
    correct: 3,
    fact: 'Hajj is the 5th Pillar of Islam. Every Muslim who is physically and financially able must perform it at least once in their lifetime.',
  },
  {
    q: 'During Rami, pilgrims throw pebbles at what?',
    options: ['A river', 'The mountains', 'The Jamarat pillars', 'The Kaaba'],
    correct: 2,
    fact: 'Rami al-Jamarat is the stoning of three pillars in Mina. It represents throwing pebbles at Shaytan (Satan) as Ibrahim (AS) did.',
  },
];

const DAILY_LIMIT = 2;
const getPlayKey = () => `hajj-quiz-plays-${new Date().toDateString()}`;

export default function HajjQuizGame() {
  const router = useRouter();
  const { user } = useAuth() as any;

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'complete' | 'limited'>('menu');
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [showFact, setShowFact] = useState(false);
  const [shuffled, setShuffled] = useState<Question[]>([]);

  const startQuiz = () => {
    const plays = parseInt(localStorage.getItem(getPlayKey()) || '0', 10);
    if (plays >= DAILY_LIMIT) { setGameState('limited'); return; }
    localStorage.setItem(getPlayKey(), String(plays + 1));
    // Shuffle questions
    const arr = [...questions].sort(() => Math.random() - 0.5);
    setShuffled(arr);
    setQIdx(0);
    setScore(0);
    setAnswered(null);
    setShowFact(false);
    setGameState('playing');
  };

  const handleAnswer = (idx: number) => {
    if (answered !== null) return;
    setAnswered(idx);
    setShowFact(true);
    if (idx === shuffled[qIdx].correct) setScore((s) => s + 20);
  };

  const nextQ = () => {
    if (qIdx + 1 >= shuffled.length) {
      setGameState('complete');
      return;
    }
    setQIdx((i) => i + 1);
    setAnswered(null);
    setShowFact(false);
  };

  useEffect(() => {
    if (gameState === 'complete' && user?.id) {
      awardPointsRpc(Math.round(score / 10)).catch(() => {});
    }
  }, [gameState, user, score]);

  const plays = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem(getPlayKey()) || '0', 10)
    : 0;

  const q = shuffled[qIdx];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-4 pb-20">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-purple-700 mb-4 font-bold">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-purple-900">🧠 Hajj Quiz</h1>
        <p className="text-gray-500 text-sm">Test your knowledge of Hajj!</p>
      </div>

      {/* ── MENU ───────────────────────────────────────── */}
      {gameState === 'menu' && (
        <div className="max-w-sm mx-auto bg-white rounded-3xl p-8 shadow-lg text-center border border-purple-100">
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-2xl font-bold text-purple-800 mb-2">Ready to play?</h2>
          <p className="text-gray-500 text-sm mb-4">
            10 questions about Hajj &amp; its rituals. 20 points for each correct answer!
          </p>
          <div className="bg-purple-50 rounded-2xl p-3 mb-6 text-sm text-purple-700">
            📅 Daily plays remaining:{' '}
            <strong>{Math.max(0, DAILY_LIMIT - plays)}</strong> / {DAILY_LIMIT}
          </div>
          <button
            onClick={startQuiz}
            className="bg-gradient-to-r from-purple-500 to-purple-700 text-white font-black text-xl px-8 py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
          >
            Start Quiz ✨
          </button>
        </div>
      )}

      {/* ── DAILY LIMIT ─────────────────────────────────── */}
      {gameState === 'limited' && (
        <div className="max-w-sm mx-auto bg-white rounded-3xl p-8 shadow-lg text-center border border-orange-200">
          <div className="text-6xl mb-3">⏰</div>
          <h2 className="text-2xl font-black text-orange-700 mb-2">Come Back Tomorrow!</h2>
          <p className="text-gray-600 mb-4">
            You&apos;ve completed your {DAILY_LIMIT} quizzes for today. Come back tomorrow for more!
          </p>
          <p className="text-gray-400 text-sm mb-6">
            In the meantime, explore the other Hajj games 👇
          </p>
          <button onClick={() => router.back()} className="bg-gray-100 text-gray-700 font-bold px-6 py-3 rounded-2xl hover:bg-gray-200">
            ← Back to Games
          </button>
        </div>
      )}

      {/* ── COMPLETE ───────────────────────────────────── */}
      {gameState === 'complete' && (
        <div className="max-w-sm mx-auto bg-white rounded-3xl p-8 shadow-lg text-center border border-purple-100">
          <div className="text-7xl mb-3">🏆</div>
          <h2 className="text-3xl font-black text-purple-700 mb-2">Quiz Complete!</h2>
          <p className="text-gray-600 mb-1 text-lg">
            You scored <span className="font-black text-purple-700">{score}</span> / {questions.length * 20} points!
          </p>
          <p className="text-gray-400 text-sm mb-2">
            {score === questions.length * 20
              ? '🌟 Perfect score! MashaAllah!'
              : score >= questions.length * 12
              ? '👍 Great job! Keep learning!'
              : '📖 Keep studying and try again tomorrow!'}
          </p>
          <p className="text-gray-400 text-sm mb-6">Points have been added to your account.</p>
          <button onClick={() => router.back()} className="bg-purple-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-purple-700">
            ← Back to Games
          </button>
        </div>
      )}

      {/* ── PLAYING ────────────────────────────────────── */}
      {gameState === 'playing' && q && (
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full text-sm">
              Q {qIdx + 1} / {shuffled.length}
            </span>
            <span className="bg-yellow-100 text-yellow-700 font-bold px-3 py-1 rounded-full text-sm">
              ⭐ {score} pts
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${((qIdx + 1) / shuffled.length) * 100}%` }}
            />
          </div>

          {/* Question card */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-purple-100">
            <p className="text-lg font-bold text-gray-800 mb-5">{q.q}</p>

            <div className="space-y-3">
              {q.options.map((opt, i) => {
                let cls = 'w-full text-left px-5 py-4 rounded-2xl border-2 font-medium transition-all ';
                if (answered === null) {
                  cls += 'border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50 cursor-pointer';
                } else if (i === q.correct) {
                  cls += 'border-green-500 bg-green-50 text-green-800';
                } else if (i === answered) {
                  cls += 'border-red-400 bg-red-50 text-red-700';
                } else {
                  cls += 'border-gray-200 bg-gray-50 text-gray-400';
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    onClick={() => handleAnswer(i)}
                    disabled={answered !== null}
                  >
                    {answered !== null && i === q.correct && '✅ '}
                    {answered !== null && i === answered && i !== q.correct && '❌ '}
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Fun fact */}
            {showFact && (
              <div
                className={`mt-4 p-4 rounded-2xl text-sm ${
                  answered === q.correct ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
                }`}
              >
                <span className="font-bold">
                  {answered === q.correct ? '🎉 Correct! ' : '📖 Did you know? '}
                </span>
                {q.fact}
              </div>
            )}

            {answered !== null && (
              <button
                onClick={nextQ}
                className="mt-4 w-full bg-gradient-to-r from-purple-500 to-purple-700 text-white font-black text-lg py-3 rounded-2xl hover:opacity-90 active:scale-95 transition-all"
              >
                {qIdx + 1 === shuffled.length ? 'See Results 🏆' : 'Next Question →'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
