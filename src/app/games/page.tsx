'use client';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { awardPoints as awardPointsRpc } from '@/lib/points-service';
import {
  hangmanTopics,
  crosswordPuzzles,
  wordScramblePool,
  trueOrFalsePool,
  namesOfAllahPool,
} from '@/data/games';
import type { CrosswordPuzzle } from '@/data/games';
import { Star, Trophy, Target, Sparkles, ArrowLeft, Puzzle } from 'lucide-react';

type GameId = 'hangman' | 'crossword' | 'scramble' | 'true-or-false' | 'names-of-allah';
type TaskKind = 'mcq' | 'hangman' | 'crossword' | 'scramble';

interface Option { id: string; text: string; }
interface Task {
  id: string; prompt: string; kind: TaskKind;
  options: Option[]; correctOptionId?: string; points: number;
  meta?: Record<string, any>;
}
interface GameSession { id: GameId; title: string; icon: string; tasks: Task[]; }
type CompletionSummary = { gameTitle: string; pointsEarned: number; };

const gameCatalog: { id: GameId; title: string; description: string; icon: string; color: string }[] = [
  { id: 'hangman',        title: 'Islamic Hangman',   description: 'Guess Islamic words letter by letter',        icon: '🏗️', color: 'from-[#ec4899] to-[#db2777]' },
  { id: 'crossword',      title: 'Islamic Crossword', description: 'Fill in the Islamic crossword puzzle',        icon: '🔤', color: 'from-[#14b8a6] to-[#0d9488]' },
  { id: 'scramble',       title: 'Word Scramble',     description: 'Unscramble mixed-up Islamic words',           icon: '🔀', color: 'from-[#8b5cf6] to-[#6366f1]' },
  { id: 'true-or-false',  title: 'True or False',     description: 'Test your Islamic knowledge with T/F',       icon: '✅', color: 'from-[#f59e0b] to-[#d97706]' },
  { id: 'names-of-allah', title: '99 Names of Allah', description: "Match Allah's beautiful names to meanings",  icon: '☪️', color: 'from-[#3b82f6] to-[#2563eb]' },
];

const shuffle = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildCrosswordGrid = (puzzle: CrosswordPuzzle): string[][] => {
  const grid: string[][] = Array.from({ length: puzzle.rows }, () =>
    Array.from({ length: puzzle.cols }, () => '')
  );
  for (const word of puzzle.words) {
    for (let i = 0; i < word.word.length; i++) {
      const r = word.direction === 'across' ? word.row : word.row + i;
      const c = word.direction === 'across' ? word.col + i : word.col;
      grid[r][c] = word.word[i];
    }
  }
  return grid;
};

const getCrosswordCellMeta = (puzzle: CrosswordPuzzle, r: number, c: number) => {
  let inGrid = false;
  let clueNumber: number | undefined;
  for (const word of puzzle.words) {
    for (let i = 0; i < word.word.length; i++) {
      const wr = word.direction === 'across' ? word.row : word.row + i;
      const wc = word.direction === 'across' ? word.col + i : word.col;
      if (wr === r && wc === c) {
        inGrid = true;
        if (i === 0) clueNumber = word.number;
      }
    }
  }
  return { inGrid, clueNumber };
};

export default function GamesPage() {
  const router = useRouter();
  const { user, refreshProfile, profile, updateLocalProfile } = useAuth() as any;
  const [selectedGameId, setSelectedGameId] = useState<GameId | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [taskIndex, setTaskIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hangmanGuesses, setHangmanGuesses] = useState<Set<string>>(new Set());
  const [hangmanWrongCount, setHangmanWrongCount] = useState(0);
  const [crosswordInputs, setCrosswordInputs] = useState<Record<string, string>>({});
  const [crosswordPuzzleState, setCrosswordPuzzleState] = useState<CrosswordPuzzle | null>(null);
  const [crosswordSolved, setCrosswordSolved] = useState(false);
  const [crosswordErrors, setCrosswordErrors] = useState<Record<string, boolean>>({});
  const [crosswordChecked, setCrosswordChecked] = useState(false);
  const [scrambleInput, setScrambleInput] = useState('');
  const [scrambleCorrect, setScrambleCorrect] = useState(false);
  const [scrambleRevealed, setScrambleRevealed] = useState(false);
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const scrambleWordsCorrect = useRef(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionSummary | null>(null);

  const showToast = (msg: string, ms = 2500) => { setToast(msg); setTimeout(() => setToast(null), ms); };
  const applyPointGain = (earned: number) => { setPoints(p => { const n = p + earned; pointsRef.current = n; return n; }); };

  const resetState = () => {
    setTaskIndex(0); setSelectedOption(null);
    setHangmanGuesses(new Set()); setHangmanWrongCount(0);
    setCrosswordInputs({}); setCrosswordPuzzleState(null);
    setCrosswordSolved(false); setCrosswordErrors({}); setCrosswordChecked(false);
    setScrambleInput(''); setScrambleCorrect(false); setScrambleRevealed(false);
    setPoints(0); pointsRef.current = 0; scrambleWordsCorrect.current = 0; setFeedback(null);
  };

  const awardPointsForGame = async (base: number) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const result = await awardPointsRpc(base);
      if (!result.success) { showToast(result.message || 'No points awarded.'); return; }
      applyPointGain(result.points_awarded ?? base);
      if (result.total_points !== undefined || result.weekly_points !== undefined) {
        updateLocalProfile({ points: result.total_points, weeklyPoints: result.weekly_points, monthlyPoints: result.monthly_points, todayPoints: result.today_points });
      }
      showToast(`⭐ +${result.points_awarded} points!`);
      await refreshProfile();
    } catch { showToast('Points not saved. Try again.'); }
    finally { setLoading(false); }
  };

  const finishGame = async () => {
    const finalPoints = pointsRef.current;
    try {
      if (user?.id) await fetch('/api/games/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, gameId: selectedGameId, gameTitle: session?.title || 'Game', pointsEarned: finalPoints, difficulty: 'medium', tasksPlayed: session?.tasks.length || 0 }) });
    } catch {}
    setCompletion({ gameTitle: session?.title || 'Game', pointsEarned: finalPoints });
    setSelectedGameId(null); setSession(null); resetState();
  };

  const quitGame = () => { setSelectedGameId(null); setSession(null); resetState(); };

  const buildGameSession = (gameId: GameId): GameSession | null => {
    const gameInfo = gameCatalog.find(g => g.id === gameId)!;
    let tasks: Task[] = [];
    switch (gameId) {
      case 'hangman': {
        const topics = Object.keys(hangmanTopics.topics);
        const topic = topics[randomInt(0, topics.length - 1)];
        const words = hangmanTopics.topics[topic] || [];
        const chosen = words[randomInt(0, Math.max(0, words.length - 1))];
        if (!chosen) return null;
        tasks = [{ id: `hangman-${topic}`, prompt: `${topic}: ${chosen.hint}`, kind: 'hangman', options: [], points: 20, meta: { word: chosen.word } }];
        break;
      }
      case 'crossword': {
        const puzzle = crosswordPuzzles[randomInt(0, crosswordPuzzles.length - 1)];
        tasks = [{ id: `crossword-${puzzle.id}`, prompt: puzzle.title, kind: 'crossword', options: [], points: 20, meta: { puzzleId: puzzle.id } }];
        break;
      }
      case 'scramble': {
        tasks = shuffle(wordScramblePool).slice(0, 8).map(w => ({ id: `scramble-${w.id}`, prompt: w.hint, kind: 'scramble' as TaskKind, options: [], points: 0, meta: { word: w.word, scrambled: w.scrambled } }));
        break;
      }
      case 'true-or-false': {
        tasks = shuffle(trueOrFalsePool).slice(0, 10).map(item => ({ id: item.id, prompt: item.prompt, kind: 'mcq' as TaskKind, options: item.options, correctOptionId: item.correctOptionId, points: item.points }));
        break;
      }
      case 'names-of-allah': {
        tasks = shuffle(namesOfAllahPool).slice(0, 10).map(item => ({ id: item.id, prompt: item.prompt, kind: 'mcq' as TaskKind, options: item.options, correctOptionId: item.correctOptionId, points: item.points }));
        break;
      }
      default: return null;
    }
    return { id: gameId, title: gameInfo.title, icon: gameInfo.icon, tasks };
  };

  useEffect(() => {
    if (!selectedGameId) return;
    const newSession = buildGameSession(selectedGameId);
    if (!newSession) { showToast('Failed to load game.'); setSelectedGameId(null); return; }
    setSession(newSession);
    if (selectedGameId === 'crossword') {
      const puzzleId = newSession.tasks[0]?.meta?.puzzleId;
      const puzzle = crosswordPuzzles.find(p => p.id === puzzleId) || null;
      setCrosswordPuzzleState(puzzle);
    }
  }, [selectedGameId]);

  const startGame = (gameId: GameId) => {
    if (!user?.id) { showToast('Please sign in to play and earn points'); return; }
    setSelectedGameId(gameId); resetState();
  };

  const currentTask = session?.tasks[taskIndex];
  const crosswordKey = (r: number, c: number) => `${r}-${c}`;

  const handleMcqAnswer = async (optionId: string) => {
    if (!currentTask || currentTask.kind !== 'mcq' || loading || selectedOption !== null) return;
    setSelectedOption(optionId);
    const isCorrect = optionId === currentTask.correctOptionId;
    if (isCorrect) { setFeedback('Correct! MashaAllah 🎉'); await awardPointsForGame(currentTask.points); }
    else setFeedback('Not quite. Keep learning!');
    setTimeout(async () => {
      setFeedback(null); setSelectedOption(null);
      if (taskIndex < (session?.tasks.length ?? 0) - 1) setTaskIndex(p => p + 1);
      else await finishGame();
    }, 900);
  };

  const handleHangmanGuess = async (letter: string) => {
    if (!currentTask || currentTask.kind !== 'hangman' || hangmanGuesses.has(letter) || hangmanWrongCount >= 6) return;
    const word = (currentTask.meta?.word as string)?.toUpperCase() || '';
    const newGuesses = new Set(hangmanGuesses); newGuesses.add(letter);
    setHangmanGuesses(newGuesses);
    if (word.includes(letter)) {
      const isComplete = [...word].every(ch => newGuesses.has(ch));
      if (isComplete) {
        setFeedback('🎉 MashaAllah! You guessed it!');
        await awardPointsForGame(20);
        setTimeout(async () => { setFeedback(null); await finishGame(); }, 1500);
      }
    } else {
      const nw = hangmanWrongCount + 1; setHangmanWrongCount(nw);
      if (nw >= 6) { setFeedback(`Game Over! The word was ${word}`); setTimeout(async () => { setFeedback(null); await finishGame(); }, 2500); }
    }
  };

  const handleCrosswordInput = (r: number, c: number, value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
    setCrosswordInputs(prev => ({ ...prev, [crosswordKey(r, c)]: upper }));
    setCrosswordChecked(false); setCrosswordErrors({});
  };

  const checkCrossword = async () => {
    if (!crosswordPuzzleState) return;
    const grid = buildCrosswordGrid(crosswordPuzzleState);
    const errors: Record<string, boolean> = {};
    let allCorrect = true;
    for (let r = 0; r < crosswordPuzzleState.rows; r++) {
      for (let c = 0; c < crosswordPuzzleState.cols; c++) {
        if (grid[r][c]) {
          const key = crosswordKey(r, c);
          if ((crosswordInputs[key] || '') !== grid[r][c]) { errors[key] = true; allCorrect = false; }
        }
      }
    }
    setCrosswordErrors(errors); setCrosswordChecked(true);
    if (allCorrect) {
      setCrosswordSolved(true); setFeedback('🎉 MashaAllah! Crossword completed!');
      await awardPointsForGame(20);
      setTimeout(async () => { setFeedback(null); await finishGame(); }, 1800);
    } else { setFeedback('Some answers are incorrect. Keep trying!'); setTimeout(() => setFeedback(null), 2000); }
  };

  const handleScrambleSubmit = async () => {
    if (!currentTask || currentTask.kind !== 'scramble') return;
    const correct = currentTask.meta?.word as string;
    const isCorrect = scrambleInput.trim().toUpperCase() === correct;
    if (isCorrect) { scrambleWordsCorrect.current += 1; setScrambleCorrect(true); setFeedback('Correct! MashaAllah 🎉'); }
    else setFeedback(`Not quite! The answer was ${correct}`);
    setTimeout(async () => {
      setFeedback(null); setScrambleInput(''); setScrambleCorrect(false); setScrambleRevealed(false);
      if (taskIndex < (session?.tasks.length ?? 0) - 1) setTaskIndex(p => p + 1);
      else {
        if (scrambleWordsCorrect.current >= Math.floor((session?.tasks.length ?? 0) / 2)) await awardPointsForGame(20);
        scrambleWordsCorrect.current = 0; await finishGame();
      }
    }, 900);
  };

  const revealScramble = () => { if (!currentTask) return; setScrambleRevealed(true); setScrambleInput(currentTask.meta?.word as string); };

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
                  {session.tasks.length > 1 && <p className="text-sm text-[#a1633a]">Question {taskIndex + 1} of {session.tasks.length}</p>}
                </div>
              </div>
              <div className="bg-[#f0fdfa] px-4 py-2 rounded-xl">
                <p className="text-sm font-bold text-[#14b8a6]">⭐ {points} pts</p>
              </div>
            </div>

            {currentTask?.kind === 'hangman' && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <svg width="120" height="130" viewBox="0 0 120 130" className="stroke-[#6a422d] fill-none stroke-2">
                    <line x1="10" y1="125" x2="110" y2="125" />
                    <line x1="40" y1="125" x2="40" y2="10" />
                    <line x1="40" y1="10" x2="80" y2="10" />
                    <line x1="80" y1="10" x2="80" y2="30" />
                    {hangmanWrongCount >= 1 && <circle cx="80" cy="40" r="10" />}
                    {hangmanWrongCount >= 2 && <line x1="80" y1="50" x2="80" y2="85" />}
                    {hangmanWrongCount >= 3 && <line x1="80" y1="58" x2="60" y2="73" />}
                    {hangmanWrongCount >= 4 && <line x1="80" y1="58" x2="100" y2="73" />}
                    {hangmanWrongCount >= 5 && <line x1="80" y1="85" x2="60" y2="110" />}
                    {hangmanWrongCount >= 6 && <line x1="80" y1="85" x2="100" y2="110" />}
                  </svg>
                </div>
                <p className="text-center text-[#a1633a] font-medium">Hint: {currentTask.prompt}</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {(currentTask.meta?.word as string)?.split('').map((char, idx) => (
                    <div key={idx} className="w-10 h-12 border-b-4 border-[#6a422d] flex items-center justify-center text-2xl font-bold text-[#6a422d]">
                      {hangmanGuesses.has(char.toUpperCase()) ? char.toUpperCase() : ''}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5 max-w-xs mx-auto">
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
                    <button key={char} onClick={() => handleHangmanGuess(char)}
                      disabled={hangmanGuesses.has(char) || hangmanWrongCount >= 6}
                      className={`p-2 rounded-lg font-bold text-sm transition ${hangmanGuesses.has(char) ? ((currentTask.meta?.word as string)?.toUpperCase().includes(char) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400') : 'bg-[#f9f0e6] text-[#6a422d] hover:bg-[#14b8a6] hover:text-white'}`}>
                      {char}
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-[#a1633a]">Wrong guesses: {hangmanWrongCount}/6</p>
              </div>
            )}

            {currentTask?.kind === 'crossword' && crosswordPuzzleState && (() => {
              const solvedGrid = buildCrosswordGrid(crosswordPuzzleState);
              return (
                <div className="space-y-6">
                  <p className="text-lg font-semibold text-[#6a422d] text-center">{crosswordPuzzleState.title}</p>
                  <div className="overflow-x-auto">
                    <div className="inline-grid gap-0.5 mx-auto" style={{ gridTemplateColumns: `repeat(${crosswordPuzzleState.cols}, 2.5rem)` }}>
                      {Array.from({ length: crosswordPuzzleState.rows }, (_, r) =>
                        Array.from({ length: crosswordPuzzleState.cols }, (_, c) => {
                          const { inGrid, clueNumber } = getCrosswordCellMeta(crosswordPuzzleState, r, c);
                          const key = crosswordKey(r, c);
                          const val = crosswordInputs[key] || '';
                          const hasError = crosswordChecked && crosswordErrors[key];
                          const isCorrectCell = crosswordChecked && !crosswordErrors[key] && inGrid && !!val;
                          if (!inGrid) return <div key={key} className="w-10 h-10 bg-[#6a422d]" />;
                          return (
                            <div key={key} className="relative w-10 h-10">
                              {clueNumber && <span className="absolute top-0.5 left-0.5 text-[9px] font-bold text-[#6a422d] z-10 leading-none">{clueNumber}</span>}
                              <input type="text" maxLength={1} value={val} onChange={e => handleCrosswordInput(r, c, e.target.value)} disabled={crosswordSolved}
                                className={`w-10 h-10 border-2 text-center font-bold uppercase text-[#6a422d] text-base focus:outline-none focus:border-[#14b8a6] transition ${hasError ? 'border-red-400 bg-red-50' : isCorrectCell ? 'border-emerald-400 bg-emerald-50' : 'border-[#e5c9a3] bg-[#fffdf9]'}`} />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="font-bold text-[#6a422d] mb-2">Across</p>
                      {crosswordPuzzleState.words.filter(w => w.direction === 'across').map(w => (
                        <p key={w.id} className="text-sm text-[#a1633a]"><span className="font-semibold text-[#6a422d]">{w.number}.</span> {w.clue}</p>
                      ))}
                    </div>
                    <div>
                      <p className="font-bold text-[#6a422d] mb-2">Down</p>
                      {crosswordPuzzleState.words.filter(w => w.direction === 'down').map(w => (
                        <p key={w.id} className="text-sm text-[#a1633a]"><span className="font-semibold text-[#6a422d]">{w.number}.</span> {w.clue}</p>
                      ))}
                    </div>
                  </div>
                  {!crosswordSolved && (
                    <button onClick={checkCrossword} disabled={loading} className="w-full py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-60">
                      Check Answers
                    </button>
                  )}
                </div>
              );
            })()}

            {currentTask?.kind === 'scramble' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-[#a1633a]">Word {taskIndex + 1} of {session.tasks.length}</p>
                  <p className="text-[#6a422d] font-medium">Hint: <span className="font-semibold">{currentTask.prompt}</span></p>
                  <div className="flex gap-2 justify-center flex-wrap mt-4">
                    {(currentTask.meta?.scrambled as string)?.split('').map((ch, idx) => (
                      <div key={idx} className="w-10 h-10 bg-[#fbbf24] rounded-lg flex items-center justify-center text-xl font-bold text-white shadow">{ch}</div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 max-w-sm mx-auto">
                  <input type="text" value={scrambleInput} onChange={e => setScrambleInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleScrambleSubmit()} placeholder="Type your answer…"
                    disabled={scrambleCorrect}
                    className="flex-1 border-2 border-[#e5c9a3] rounded-xl px-4 py-3 text-[#6a422d] font-bold uppercase text-center focus:outline-none focus:border-[#14b8a6]" />
                  <button onClick={handleScrambleSubmit} disabled={!scrambleInput || loading}
                    className="px-4 py-3 bg-[#14b8a6] text-white font-bold rounded-xl hover:bg-[#0d9488] transition disabled:opacity-50">Go!</button>
                </div>
                <div className="flex justify-center">
                  <button onClick={revealScramble} disabled={scrambleRevealed} className="text-sm text-[#a1633a] hover:text-[#6a422d] underline disabled:opacity-40">Reveal answer (skip)</button>
                </div>
              </div>
            )}

            {currentTask?.kind === 'mcq' && (
              <div className="space-y-4">
                <p className="text-lg font-semibold text-[#6a422d]">{currentTask.prompt}</p>
                <div className="space-y-3">
                  {currentTask.options.map(opt => {
                    const isSelected = selectedOption === opt.id;
                    const isCorrect = opt.id === currentTask.correctOptionId;
                    let cls = 'w-full text-left rounded-xl px-4 py-3 border-2 transition font-medium';
                    if (selectedOption && isSelected && isCorrect) cls += ' border-emerald-500 bg-emerald-50 text-emerald-700';
                    else if (selectedOption && isSelected && !isCorrect) cls += ' border-red-400 bg-red-50 text-red-700';
                    else if (selectedOption && isCorrect) cls += ' border-emerald-300 bg-emerald-50 text-emerald-700';
                    else cls += ' border-[#e5c9a3]/50 bg-white text-[#6a422d] hover:border-[#14b8a6] hover:bg-[#f0fdfa]';
                    return <button key={opt.id} disabled={!!selectedOption || loading} onClick={() => handleMcqAnswer(opt.id)} className={cls}>{opt.text}</button>;
                  })}
                </div>
              </div>
            )}

            {feedback && <div className="mt-4 p-4 bg-[#fffbeb] rounded-xl text-[#b45309] font-semibold text-center">{feedback}</div>}
          </div>
        </div>
        {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#6a422d] text-white px-6 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#fdf8f3] pattern-islamic">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fffbeb] rounded-full border border-[#fbbf24]/30">
              <Sparkles size={16} className="text-[#f59e0b]" />
              <span className="text-sm font-semibold text-[#b45309]">Learn Through Play</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#6a422d]">Islamic Games</h1>
            <p className="text-[#a1633a] text-lg max-w-2xl mx-auto">Play fun games while learning about Islam. Earn up to 20 points per game!</p>
          </div>
          <div className="bg-gradient-to-r from-[#ecfeff] to-[#f0fdfa] border border-[#14b8a6]/30 rounded-2xl p-5 text-center">
            <p className="text-[#0f766e] font-bold text-base md:text-lg">New winner will be announced on 1 May 2026.</p>
            <p className="text-[#115e59] mt-2 text-sm md:text-base">Please continue taking part every day to win prizes. You must take part at least 3 times in a week to enter the prize draw.</p>
            <p className="text-[#0f766e] mt-2 text-sm md:text-base font-semibold">Check the Rewards page for important announcements and your weekly and monthly achievements.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[{ icon: Star, label: 'Your Points', value: profile?.points || 0, color: 'text-[#f59e0b]' }, { icon: Trophy, label: 'Badges', value: profile?.badges || 0, color: 'text-[#14b8a6]' }, { icon: Target, label: 'Games Played', value: profile?.gamesPlayed || 0, color: 'text-[#8b5cf6]' }].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 text-center border border-[#e5c9a3]/20 shadow-sm">
                <stat.icon size={24} className={`mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl font-bold text-[#6a422d]">{stat.value}</p>
                <p className="text-xs text-[#a1633a]">{stat.label}</p>
              </div>
            ))}
          </div>
          {/* ── Hajj Learning Games featured banner ── */}
          <div
            className="rounded-2xl overflow-hidden border border-[#3b82f6]/30 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
            onClick={() => router.push('/games/hajj')}
            role="link"
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-5 flex items-center gap-5">
              <span className="text-5xl shrink-0">🕌</span>
              <div className="flex-1 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-xl">Hajj Learning Games</h3>
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-0.5 rounded-full">NEW</span>
                </div>
                <p className="text-blue-100 text-sm">5 interactive games — Tawaf, Safa &amp; Marwah, Ibrahim&apos;s Story, Hajj Quiz &amp; more!</p>
              </div>
              <span className="text-white text-2xl shrink-0">→</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {gameCatalog.map(game => (
              <button key={game.id} onClick={() => startGame(game.id)} className="group bg-white rounded-2xl p-6 border border-[#e5c9a3]/20 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 text-left">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform mb-4`}>
                  <span className="text-3xl">{game.icon}</span>
                </div>
                <h3 className="font-bold text-[#6a422d] text-lg mb-1">{game.title}</h3>
                <p className="text-sm text-[#a1633a] mb-3">{game.description}</p>
                <span className="inline-block text-xs font-semibold text-[#0d9488] bg-[#f0fdfa] px-3 py-1 rounded-full border border-[#14b8a6]/30">🌟 Up to 20 points</span>
              </button>
            ))}
          </div>
          <div className="bg-[#f0fdfa] rounded-2xl p-6 border border-[#14b8a6]/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#14b8a6] flex items-center justify-center flex-shrink-0">
                <Puzzle size={24} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-[#0d9488] mb-1">Pro Tip</h4>
                <p className="text-[#115e59]">Try all 5 games to learn different aspects of Islam — hangman improves vocabulary, the crossword tests spelling, word scramble sharpens recognition, and the quizzes deepen your knowledge of Allah's names and Islamic facts!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#6a422d] text-white px-6 py-3 rounded-xl shadow-lg z-50">{toast}</div>}
      <Modal isOpen={Boolean(completion)} onClose={() => setCompletion(null)} title="Great Job!">
        <div className="space-y-4 text-center">
          <p className="text-[#6a422d] font-semibold">You completed <strong>{completion?.gameTitle}</strong> and earned <strong>{completion?.pointsEarned ?? 0}</strong> points.</p>
          <p className="text-sm text-[#a1633a]">Please open Rewards to see your progress and fill the winner contact form so we can contact you if your child wins.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setCompletion(null)} className="px-4 py-2 rounded-lg border border-[#e5c9a3]/40 text-[#6a422d] font-semibold hover:bg-[#f9f0e6]">Close</button>
            <button onClick={() => { setCompletion(null); router.push('/rewards#winner-contact-form'); }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold">Open Rewards + Form</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
