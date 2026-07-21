'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AGE_GROUPS, AgeGroup } from '@/data/age-specific-content';
import { Button } from '@/components';
import { BookOpen, Star, RefreshCw } from 'lucide-react';
import { completeGameSession } from '@/lib/complete-game-session';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { useAuth } from '@/lib/auth-context';

type GameState = 'playing' | 'completed';

interface Card {
  id: string; // unique instance id
  content: string;
  matchId: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function QuranMatchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [moves, setMoves] = useState(0);
  const [pointsMessage, setPointsMessage] = useState<string | null>(null);
  const pointsAwardedRef = useRef(false);

  const startNewGameForGroup = (group: AgeGroup) => {
    pointsAwardedRef.current = false;
    setPointsMessage(null);
    const pairs = AGE_GROUPS[group].quranMatch;

    const gameCards: Card[] = [];
    pairs.forEach((pair, index) => {
      gameCards.push({
        id: `card-${index}-1`,
        content: pair.item1,
        matchId: pair.matchId,
        isFlipped: false,
        isMatched: false,
      });
      gameCards.push({
        id: `card-${index}-2`,
        content: pair.item2,
        matchId: pair.matchId,
        isFlipped: false,
        isMatched: false,
      });
    });

    setCards(shuffleArray(gameCards));
    setMoves(0);
    setGameState('playing');
    setSelectedCards([]);
  };

  const startNewGame = () => {
    if (!ageGroup) return;
    startNewGameForGroup(ageGroup);
  };

  const handleSelectAgeGroup = (group: AgeGroup) => {
    setAgeGroup(group);
    startNewGameForGroup(group);
  };

  const handleCardClick = (clickedCard: Card) => {
    if (
      gameState !== 'playing' || 
      clickedCard.isMatched || 
      clickedCard.isFlipped || 
      selectedCards.length >= 2
    ) {
      return;
    }

    // Flip the card
    const newCards = cards.map(c => 
      c.id === clickedCard.id ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    const newSelected = [...selectedCards, clickedCard];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves(m => m + 1);
      checkForMatch(newSelected[0], newSelected[1]);
    }
  };

  const checkForMatch = (card1: Card, card2: Card) => {
    if (card1.matchId === card2.matchId) {
      // Match found
      setTimeout(() => {
        setCards(prev => prev.map(c => 
          c.matchId === card1.matchId ? { ...c, isMatched: true, isFlipped: true } : c
        ));
        setSelectedCards([]);
        
        // Check win condition
        setCards(currentCards => {
            const allMatched = currentCards.every(c => c.matchId === card1.matchId || c.isMatched);
            if (allMatched) {
                setGameState('completed');
                if (user?.id && !pointsAwardedRef.current) {
                  pointsAwardedRef.current = true;
                  completeGameSession({
                    userId: user.id,
                    gameId: 'quran-match',
                    gameTitle: 'Quran Match',
                    trackCompetition: true,
                  }).then((result) => {
                    if (result.ok && result.pointsAwarded > 0) {
                      setPointsMessage(`+${result.pointsAwarded} points earned!`);
                    } else if (result.message) {
                      setPointsMessage(result.message);
                    } else {
                      setPointsMessage(`Up to +${ACTIVITY_BONUS_POINTS} pts per game daily`);
                    }
                  }).catch(() => {});
                }
            }
            return currentCards;
        });

      }, 500);
    } else {
      // No match
      setTimeout(() => {
        setCards(prev => prev.map(c => 
          c.id === card1.id || c.id === card2.id ? { ...c, isFlipped: false } : c
        ));
        setSelectedCards([]);
      }, 1000);
    }
  };

  if (!ageGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-purple-800 mb-4 islamic-shadow">
              🧩 Quran Match Game
            </h1>
            <p className="text-purple-600 text-lg">
              Match the Quranic terms with their meanings.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-purple-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Select your age group to start</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <button
                onClick={() => handleSelectAgeGroup('6-8')}
                className="p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition group"
              >
                <div className="text-2xl mb-2">🌱</div>
                <div className="font-bold text-green-800">Ages 6-8</div>
                <div className="text-xs text-green-600">Explorers</div>
              </button>
              <button
                onClick={() => handleSelectAgeGroup('9-11')}
                className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition group"
              >
                <div className="text-2xl mb-2">⭐</div>
                <div className="font-bold text-blue-800">Ages 9-11</div>
                <div className="text-xs text-blue-600">Champions</div>
              </button>
              <button
                onClick={() => handleSelectAgeGroup('12-14')}
                className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 transition group"
              >
                <div className="text-2xl mb-2">🕌</div>
                <div className="font-bold text-purple-800">Ages 12-14</div>
                <div className="text-xs text-purple-600">Scholars</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <Button variant="outline" onClick={() => setAgeGroup(null)}>
            ← Change Age
          </Button>
          <div className="text-purple-800 font-bold flex items-center gap-2">
            <BookOpen size={20} />
            <span>Quran Match ({ageGroup})</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-semibold text-purple-600">
            Moves: {moves}
          </div>
        </div>

        {gameState === 'completed' ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-scale-in">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-purple-800 mb-4">MashaAllah!</h2>
            <p className="text-gray-600 mb-2">You matched all the pairs in {moves} moves.</p>
            {pointsMessage && (
              <p className="text-emerald-600 font-semibold mb-4">{pointsMessage}</p>
            )}
            <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={startNewGame} className="mx-auto flex items-center gap-2">
              <RefreshCw size={18} /> Play Again
            </Button>
            <Button variant="outline" onClick={() => router.push('/games')}>
              Back to Games
            </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card)}
                disabled={card.isMatched || card.isFlipped}
                className={`
                  aspect-square rounded-xl p-4 flex items-center justify-center text-center transition-all duration-300 transform
                  ${card.isFlipped || card.isMatched 
                    ? 'bg-white border-2 border-purple-500 rotate-y-180' 
                    : 'bg-purple-600 border-2 border-purple-700 hover:bg-purple-700'}
                  ${card.isMatched ? 'opacity-50 ring-4 ring-green-400 border-green-500' : ''}
                  shadow-md
                `}
              >
                <div className={`transition-opacity duration-300 ${card.isFlipped || card.isMatched ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-sm sm:text-base font-bold text-purple-900 select-none">
                    {card.content}
                  </span>
                </div>
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${card.isFlipped || card.isMatched ? 'opacity-0' : 'opacity-100'}`}>
                  <span className="text-3xl text-white opacity-50">?</span>
                </div>
              </button>
            ))}
          </div>
        )}
        
        <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 bg-white/50 inline-block px-4 py-2 rounded-lg">
                Match the Arabic term/Surah with its meaning or description.
            </p>
        </div>
      </div>
    </div>
  );
}
