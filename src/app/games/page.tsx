'use client';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { awardPoints as awardPointsRpc } from '@/lib/points-service';
import {
  Difficulty,
  Option,
  WordSearchConfig,
  hadithActionsPool,
  hadithMeaningPool,
  hadithScenarioPool,
  halalHaramPool,
  hiddenChallenges,
  hangmanTopics,
  quranWordSearch,
  sahabahDecisionScenarios,
  sahabahTimeline,
  seerahWordSearch,
  wuduFixerPool,
  prophetTimelinePool,
  quranVersesPool,
  sunnahPracticesPool,
  duaCompletionPool,
  islamicLeadersPool,
  islamicCalendarPool,
} from '@/data/games';
import { BookOpen, Puzzle, Heart, Star, Trophy, Sparkles, ArrowLeft, Target } from 'lucide-react';

type GameId =
  | 'word-search-seerah'
  | 'word-search-quran'
  | 'hadith-match'
  | 'hadith-scenario'
  | 'wudu-fixer'
  | 'halal-haram-makrooh'
  | 'sahabah-timeline'
  | 'sahabah-decision'
  | 'hangman'
  | 'prophet-timeline'
  | 'quran-verses'
  | 'sunnah-practices'
  | 'dua-completion'
  | 'islamic-leaders'
  | 'islamic-calendar'
  | 'quran-match-game'
  | 'hadith-reflection'
  | 'quran-context';

type TaskKind = 'mcq' | 'wordsearch' | 'match' | 'timeline' | 'hangman';

interface Task {
  id: string;
  prompt: string;
  kind: TaskKind;
  options: Option[];
  correctOptionId?: string;
  points: number;
  meta?: Record<string, any>;
}

interface WordPlacement {
  word: string;
  start: [number, number];
  end: [number, number];
  reversed: boolean;
  diagonal: boolean;
}

export interface WordSearchData {
  grid: string[][];
  placements: WordPlacement[];
  targets: string[];
}

interface GameSession {
  id: GameId;
  title: string;
  icon: string;
  tasks: Task[];
  wordSearch?: WordSearchData;
  conceptualPrompt?: Task;
}

type CompletionSummary = {
  gameTitle: string;
  gameId: GameId;
  pointsEarned: number;
  difficulty: Difficulty;
  tasksPlayed: number;
};

const gameCatalog: { id: GameId; title: string; description: string; icon: string; color: string; link?: string }[] = [
  { id: 'quran-match-game', title: 'Quran Match', description: 'Match Quranic terms and meanings', icon: '🧩', color: 'from-[#14b8a6] to-[#0d9488]', link: '/quran-match' },
  { id: 'hadith-reflection', title: 'Hadith Quiz', description: 'Read a hadith and choose what it teaches', icon: '📖', color: 'from-[#8b5cf6] to-[#6366f1]', link: '/hadith' },
  { id: 'quran-context', title: 'Quran Context Quiz', description: 'Understand the context of Ayats', icon: '✨', color: 'from-[#fbbf24] to-[#f59e0b]', link: '/quran-quiz' },
  { id: 'word-search-seerah', title: 'Word Search – Seerah', description: 'Find Seerah words in the grid', icon: '🕌', color: 'from-[#14b8a6] to-[#0d9488]' },
  { id: 'word-search-quran', title: 'Word Search – Quran', description: 'Find Quran words in the grid', icon: '📜', color: 'from-[#8b5cf6] to-[#6366f1]' },
  { id: 'hadith-match', title: 'Hadith Match', description: 'Match hadith meanings to actions', icon: '🤝', color: 'from-[#14b8a6] to-[#0d9488]' },
  { id: 'hadith-scenario', title: 'Hadith Scenarios', description: 'Pick the best hadith for each scenario', icon: '🧭', color: 'from-[#8b5cf6] to-[#6366f1]' },
  { id: 'wudu-fixer', title: 'Wudu Fixer', description: 'Spot and fix wudu mistakes', icon: '💧', color: 'from-[#3b82f6] to-[#2563eb]' },
  { id: 'halal-haram-makrooh', title: 'Halal or Haram?', description: 'Classify real-life scenarios', icon: '⚖️', color: 'from-[#fbbf24] to-[#f59e0b]' },
  { id: 'sahabah-timeline', title: 'Sahabah Timeline', description: 'Arrange events in correct order', icon: '📅', color: 'from-[#14b8a6] to-[#0d9488]' },
  { id: 'sahabah-decision', title: 'Sahabah Decisions', description: 'Choose what a Sahabi would do', icon: '🛡️', color: 'from-[#8b5cf6] to-[#6366f1]' },
  { id: 'hangman', title: 'Islamic Hangman', description: 'Guess words from Islamic topics', icon: '🏗️', color: 'from-[#ec4899] to-[#db2777]' },
  { id: 'prophet-timeline', title: 'Prophet Timeline', description: 'Match prophets to their deeds', icon: '📖', color: 'from-[#fbbf24] to-[#f59e0b]' },
  { id: 'quran-verses', title: 'Quran Verses', description: 'Match surahs to their themes', icon: '✨', color: 'from-[#14b8a6] to-[#0d9488]' },
  { id: 'sunnah-practices', title: 'Sunnah Practices', description: 'Identify authentic sunnah actions', icon: '🙏', color: 'from-[#8b5cf6] to-[#6366f1]' },
  { id: 'dua-completion', title: 'Dua Completion', description: 'Complete famous Islamic duas', icon: '💬', color: 'from-[#fbbf24] to-[#f59e0b]' },
  { id: 'islamic-leaders', title: 'Islamic Leaders', description: 'Match leaders to achievements', icon: '👑', color: 'from-[#14b8a6] to-[#0d9488]' },
  { id: 'islamic-calendar', title: 'Islamic Calendar', description: 'Knowledge of the Hijri calendar', icon: '📅', color: 'from-[#8b5cf6] to-[#6366f1]' },
];

const MAX_TASKS = 6;
const limitTasks = (tasks: Task[]) => tasks.slice(0, MAX_TASKS);
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const pickMany = <T,>(arr: T[], count: number) => shuffle(arr).slice(0, count);
const weeklySeed = () => {
  const today = new Date();
  const firstJan = new Date(today.getFullYear(), 0, 1);
  const days = Math.floor((today.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
  return `${today.getFullYear()}-w${Math.ceil((today.getDay() + 1 + days) / 7)}`;
};

export default function GamesPage() {
  const router = useRouter();
  const { user, refreshProfile, profile, updateLocalProfile } = useAuth() as any;
  const [selectedGameId, setSelectedGameId] = useState<GameId | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [taskIndex, setTaskIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [foundWords, setFoundWords] = useState<Record<string, boolean>>({});
  const [foundCells, setFoundCells] = useState<Record<string, boolean>>({});
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionSummary | null>(null);
  const [wordSearchCompleted, setWordSearchCompleted] = useState(false);
  const [hangmanGuesses, setHangmanGuesses] = useState<Set<string>>(new Set());
  const [hangmanWrongCount, setHangmanWrongCount] = useState(0);

  const applyPointGain = (totalEarned: number) => {
    setPoints(prev => {
      const next = prev + totalEarned;
      pointsRef.current = next;
      return next;
    });
  };

  const weekKey = useMemo(() => weeklySeed(), []);

  const currentTask = session?.tasks[taskIndex];

  const resetState = () => {
    setTaskIndex(0);
    setSelectedOption(null);
    setFoundWords({});
    setFoundCells({});
    setWordSearchCompleted(false);
    setHangmanGuesses(new Set());
    setHangmanWrongCount(0);
    setPoints(0);
    pointsRef.current = 0;
    setFeedback(null);
  };

  const startGame = (gameId: GameId) => {
    if (!user?.id) {
      setToast('Please sign in to play and earn points');
      setTimeout(() => setToast(null), 2200);
      return;
    }
    const game = gameCatalog.find(g => g.id === gameId);
    if (game?.link) {
      router.push(game.link);
      return;
    }
    setSelectedGameId(gameId);
    resetState();
  };

  const quitGame = () => {
    setSelectedGameId(null);
    setSession(null);
    resetState();
  };

  const awardPointsForGame = async (base: number) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const result = await awardPointsRpc(base);
      if (!result.success) {
        setToast(`Daily points limit reached. Play for fun!`);
        setTimeout(() => setToast(null), 3000);
        return;
      }
      applyPointGain(result.points_awarded ?? base);
      setToast(`⭐ +${result.points_awarded} points!`);
      setTimeout(() => setToast(null), 2500);
      refreshProfile();
    } catch (err: any) {
      setToast(`Points not saved. Try again.`);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const finishGame = async () => {
    if (!user?.id || !selectedGameId) return;
    const finalPoints = pointsRef.current;
    setCompletion({
      gameTitle: session?.title || 'Game',
      gameId: selectedGameId,
      pointsEarned: finalPoints,
      difficulty,
      tasksPlayed: session?.tasks.length || 0,
    });
    setSelectedGameId(null);
    setSession(null);
    resetState();
  };

  const handleHangmanGuess = async (letter: string) => {
    if (!currentTask || currentTask.kind !== 'hangman' || hangmanGuesses.has(letter) || hangmanWrongCount >= 6) return;
    const word = (currentTask.meta?.word as string)?.toUpperCase() || '';
    const newGuesses = new Set(hangmanGuesses);
    newGuesses.add(letter);
    setHangmanGuesses(newGuesses);

    if (word.includes(letter)) {
      const isComplete = [...word].every(char => newGuesses.has(char));
      if (isComplete) {
        setFeedback('🎉 MashaAllah! You guessed it!');
        await awardPointsForGame(currentTask.points);
        setTimeout(async () => {
          setFeedback(null);
          setHangmanGuesses(new Set());
          setHangmanWrongCount(0);
          await finishGame();
        }, 1500);
      }
    } else {
      const newWrong = hangmanWrongCount + 1;
      setHangmanWrongCount(newWrong);
      if (newWrong >= 6) {
        setFeedback(`Game Over! The word was ${word}`);
        setTimeout(async () => {
          setFeedback(null);
          setHangmanGuesses(new Set());
          setHangmanWrongCount(0);
          await finishGame();
        }, 2500);
      }
    }
  };

  const keyFor = (r: number, c: number) => `${r}-${c}`;

  if (selectedGameId && session) {
    return (
      <div className="min-h-screen bg-[#fdf8f3] py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={quitGame} className="flex items-center gap-2 text-[#6a422d] hover:text-[#14b8a6] font-semibold mb-6">
            <ArrowLeft size={20} /> Back to Games
          </button>

          <div className="bg-white rounded-2xl shadow-lg border border-[#e5c9a3]/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{session.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-[#6a422d]">{session.title}</h2>
                  <p className="text-sm text-[#a1633a]">Question {taskIndex + 1} of {session.tasks.length}</p>
                </div>
              </div>
              <div className="bg-[#f0fdfa] px-4 py-2 rounded-xl">
                <p className="text-sm font-bold text-[#14b8a6]">⭐ {points} points</p>
              </div>
            </div>

            {currentTask?.kind === 'hangman' && (
              <div className="text-center space-y-6">
                <p className="text-lg font-semibold text-[#6a422d]">{currentTask.prompt}</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {(currentTask.meta?.word as string)?.split('').map((char, idx) => (
                    <div key={idx} className="w-12 h-14 border-b-4 border-[#6a422d] flex items-center justify-center text-2xl font-bold text-[#6a422d]">
                      {hangmanGuesses.has(char.toUpperCase()) ? char.toUpperCase() : ''}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2 max-w-md mx-auto">
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
                    <button
                      key={char}
                      onClick={() => handleHangmanGuess(char)}
                      disabled={hangmanGuesses.has(char) || hangmanWrongCount >= 6}
                      className={`p-2 rounded-lg font-bold transition ${
                        hangmanGuesses.has(char)
                          ? 'bg-gray-200 text-gray-400'
                          : 'bg-[#f9f0e6] text-[#6a422d] hover:bg-[#14b8a6] hover:text-white'
                      }`}
                    >
                      {char}
                    </button>
                  ))}
                </div>
                <p className="text-[#a1633a]">Wrong guesses: {hangmanWrongCount}/6</p>
              </div>
            )}

            {feedback && (
              <div className="mt-4 p-4 bg-[#fffbeb] rounded-xl text-[#b45309] font-semibold text-center">
                {feedback}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8f3] pattern-islamic">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fffbeb] rounded-full border border-[#fbbf24]/30">
            <Sparkles size={16} className="text-[#f59e0b]" />
            <span className="text-sm font-semibold text-[#b45309]">Learn Through Play</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#6a422d]">Islamic Games</h1>
          <p className="text-[#a1633a] text-lg max-w-2xl mx-auto">
            Play fun games while learning about Islam. Earn points and climb the leaderboard!
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          {[
            { icon: Star, label: 'Your Points', value: profile?.points || 0, color: 'text-[#f59e0b]' },
            { icon: Trophy, label: 'Badges', value: profile?.badges || 0, color: 'text-[#14b8a6]' },
            { icon: Target, label: 'Games Played', value: profile?.gamesPlayed || 0, color: 'text-[#8b5cf6]' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 text-center border border-[#e5c9a3]/20 shadow-sm">
              <stat.icon size={24} className={`mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold text-[#6a422d]">{stat.value}</p>
              <p className="text-xs text-[#a1633a]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameCatalog.map((game) => (
            <button
              key={game.id}
              onClick={() => startGame(game.id)}
              className="group bg-white rounded-2xl p-6 border border-[#e5c9a3]/20 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 text-left"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform mb-4`}>
                <span className="text-3xl">{game.icon}</span>
              </div>
              <h3 className="font-bold text-[#6a422d] text-lg mb-1">{game.title}</h3>
              <p className="text-sm text-[#a1633a]">{game.description}</p>
            </button>
          ))}
        </div>

        {/* Tip */}
        <div className="bg-[#f0fdfa] rounded-2xl p-6 border border-[#14b8a6]/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#14b8a6] flex items-center justify-center flex-shrink-0">
              <Puzzle size={24} className="text-white" />
            </div>
            <div>
              <h4 className="font-bold text-[#0d9488] mb-1">Pro Tip</h4>
              <p className="text-[#115e59]">
                Play different types of games to learn various aspects of Islam. 
                Word searches improve vocabulary, quizzes test knowledge, and puzzles develop critical thinking!
              </p>
            </div>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#6a422d] text-white px-6 py-3 rounded-xl shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
