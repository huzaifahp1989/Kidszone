'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  placeWordsOnGrid,
  type WordSearchConfig,
  type WordSearchData,
  type Difficulty,
  type BaseTask,
} from '@/data/games';
import { useAuth } from '@/lib/auth-context';
import { ACTIVITY_BONUS_POINTS, MAX_DAILY_GAME_COMPLETIONS } from '@/lib/points-policy';
import { completeGameSession } from '@/lib/complete-game-session';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

type ThemeId = 'ramadan' | 'seerah' | 'quran';

type Props = {
  themeId: ThemeId;
  title: string;
  emoji: string;
  config: WordSearchConfig;
};

function lineCells(r1: number, c1: number, r2: number, c2: number): [number, number][] | null {
  const dr = r2 - r1;
  const dc = c2 - c1;
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  if (len === 0) return [[r1, c1]];
  const sr = dr === 0 ? 0 : Math.sign(dr);
  const sc = dc === 0 ? 0 : Math.sign(dc);
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const cells: [number, number][] = [];
  for (let i = 0; i <= len; i++) cells.push([r1 + sr * i, c1 + sc * i]);
  return cells;
}

function wordFromCells(grid: string[][], cells: [number, number][]): string {
  return cells.map(([r, c]) => grid[r][c]).join('');
}

export function WordSearchGame({ themeId, title, emoji, config }: Props) {
  const { user, refreshProfile } = useAuth() as { user?: { id: string }; refreshProfile?: () => void };
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [puzzle, setPuzzle] = useState<WordSearchData | null>(null);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [selectStart, setSelectStart] = useState<[number, number] | null>(null);
  const [selectEnd, setSelectEnd] = useState<[number, number] | null>(null);
  const [phase, setPhase] = useState<'play' | 'bonus' | 'done'>('play');
  const [bonusIndex, setBonusIndex] = useState(0);
  const [bonusAnswer, setBonusAnswer] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const bonusTasks: BaseTask[] = useMemo(() => {
    const pool = [...(config.followUp || []), ...(config.conceptual?.choices || [])];
    return pool.slice(0, 2);
  }, [config]);

  const startPuzzle = useCallback(() => {
    const data = placeWordsOnGrid(config, difficulty);
    setPuzzle(data);
    setFound(new Set());
    setSelectStart(null);
    setSelectEnd(null);
    setPhase('play');
    setBonusIndex(0);
    setBonusAnswer(null);
    setPointsEarned(0);
    setMessage(null);
  }, [config, difficulty]);

  React.useEffect(() => {
    startPuzzle();
  }, [startPuzzle]);

  const allFound = puzzle ? found.size >= puzzle.targets.length : false;
  const advancedRef = React.useRef(false);

  React.useEffect(() => {
    advancedRef.current = false;
  }, [puzzle]);

  React.useEffect(() => {
    if (!allFound || phase !== 'play' || advancedRef.current) return;
    advancedRef.current = true;
    if (bonusTasks.length > 0) {
      setPhase('bonus');
      setMessage('Great job! Answer a bonus question to earn extra points.');
    } else {
      finishGame();
    }
  }, [allFound, phase, bonusTasks.length]);

  const finishGame = async () => {
    setPhase('done');
    if (!user?.id) {
      setPointsEarned(0);
      return;
    }
    setLoading(true);
    try {
      const result = await completeGameSession({
        userId: user.id,
        gameId: `word-search-${themeId}`,
        gameTitle: `${title} Word Search`,
        difficulty,
        trackCompetition: true,
      });
      setPointsEarned(result.pointsAwarded);
      await refreshProfile?.();
    } catch {
      setPointsEarned(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (phase !== 'play' || !puzzle) return;
    if (!selectStart) {
      setSelectStart([r, c]);
      setSelectEnd([r, c]);
      return;
    }
    const cells = lineCells(selectStart[0], selectStart[1], r, c);
    setSelectEnd([r, c]);
    if (!cells) {
      setMessage('Pick letters in a straight line (↔ ↕ or diagonal).');
      setSelectStart(null);
      setSelectEnd(null);
      return;
    }
    const word = wordFromCells(puzzle.grid, cells);
    const reversed = [...word].reverse().join('');
    const match = puzzle.targets.find(
      (t) => !found.has(t) && (t === word || t === reversed)
    );
    if (match) {
      setFound((prev) => new Set([...prev, match]));
      setMessage(`Found: ${match}!`);
    } else {
      setMessage('Not a target word — try again!');
    }
    setSelectStart(null);
    setSelectEnd(null);
  };

  const highlighted = useMemo(() => {
    const set = new Set<string>();
    if (!puzzle || !selectStart || !selectEnd) return set;
    const cells = lineCells(selectStart[0], selectStart[1], selectEnd[0], selectEnd[1]);
    cells?.forEach(([r, c]) => set.add(`${r}-${c}`));
    return set;
  }, [puzzle, selectStart, selectEnd]);

  const handleBonus = (optionId: string) => {
    const task = bonusTasks[bonusIndex];
    if (!task || bonusAnswer) return;
    setBonusAnswer(optionId);
    const correct = optionId === task.correctOptionId;
    if (bonusIndex + 1 < bonusTasks.length) {
      setTimeout(() => {
        setBonusIndex((i) => i + 1);
        setBonusAnswer(null);
      }, 1200);
    } else {
      setTimeout(() => finishGame(), 800);
    }
  };

  if (!puzzle) return null;

  return (
    <div className="page-inner mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/games/word-search" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900">
          <ArrowLeft size={18} /> All Word Hunts
        </Link>
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                difficulty === d ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-800'
              }`}
            >
              {d}
            </button>
          ))}
          <button type="button" onClick={startPuzzle} className="rounded-full bg-sand-200 px-3 py-1 text-xs font-bold text-sand-800">
            New grid
          </button>
        </div>
      </div>

      <div className="page-header">
        <h1>{emoji} {title} Word Search</h1>
        <p>Click the first letter, then the last letter of each word (straight lines only).</p>
      </div>

      {phase === 'play' && (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            {puzzle.targets.map((w) => (
              <span
                key={w}
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  found.has(w) ? 'bg-emerald-100 text-emerald-800 line-through' : 'bg-violet-100 text-violet-900'
                }`}
              >
                {w}
              </span>
            ))}
          </div>

          <div className="surface-card overflow-x-auto p-4">
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${puzzle.grid[0].length}, minmax(2rem, 1fr))` }}>
              {puzzle.grid.map((row, r) =>
                row.map((letter, c) => {
                  const key = `${r}-${c}`;
                  const isHi = highlighted.has(key);
                  const isFoundCell = puzzle.placements.some(
                    (p) =>
                      found.has(p.word) &&
                      lineCells(p.start[0], p.start[1], p.end[0], p.end[1])?.some(([pr, pc]) => pr === r && pc === c)
                  );
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCellClick(r, c)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition sm:h-10 sm:w-10 ${
                        isFoundCell
                          ? 'bg-emerald-500 text-white'
                          : isHi
                            ? 'bg-violet-500 text-white'
                            : 'bg-violet-50 text-violet-900 hover:bg-violet-200'
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {phase === 'bonus' && bonusTasks[bonusIndex] && (
        <div className="surface-card space-y-4 p-6">
          <p className="text-sm font-semibold text-violet-700">Bonus question {bonusIndex + 1} of {bonusTasks.length}</p>
          <p className="text-lg font-bold text-sand-900">{bonusTasks[bonusIndex].prompt}</p>
          <div className="space-y-2">
            {bonusTasks[bonusIndex].options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={!!bonusAnswer}
                onClick={() => handleBonus(opt.id)}
                className={`w-full rounded-xl border-2 px-4 py-3 text-left font-medium transition ${
                  bonusAnswer === opt.id
                    ? opt.id === bonusTasks[bonusIndex].correctOptionId
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-red-400 bg-red-50'
                    : 'border-sand-200 hover:border-violet-400'
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="hero-panel p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={48} />
          <h2 className="font-heading text-2xl font-bold text-sand-900">Word hunt complete!</h2>
          <p className="mt-2 text-sand-700">
            {loading
              ? 'Saving points…'
              : pointsEarned > 0
                ? `You earned ${pointsEarned} points!`
                : `Game complete! Earn +${ACTIVITY_BONUS_POINTS} points for up to ${MAX_DAILY_GAME_COMPLETIONS} games per day.`}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={startPuzzle} className="btn-primary">Play again</button>
            <Link href="/games" className="btn-accent inline-block">More games</Link>
          </div>
        </div>
      )}

      {message && phase === 'play' && (
        <p className="text-center text-sm font-semibold text-violet-700">{message}</p>
      )}
    </div>
  );
}
