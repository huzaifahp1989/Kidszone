
'use client';

import React, { useState } from 'react';
import { AGE_GROUPS, AgeGroup } from '@/data/age-specific-content';
import { Button } from '@/components';
import { Book, Star, CheckCircle, XCircle } from 'lucide-react';

export default function QuranQuizPage() {
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, boolean>>({});

  const questions = ageGroup ? AGE_GROUPS[ageGroup].quranContext : [];

  const handleSelect = (qId: string, optionIndex: number, isCorrect: boolean) => {
    setSelectedOptions(prev => ({ ...prev, [qId]: optionIndex }));
    setFeedback(prev => ({ ...prev, [qId]: isCorrect }));
  };

  if (!ageGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-blue-800 mb-4 islamic-shadow">
              📖 Quran Context Quiz
            </h1>
            <p className="text-blue-600 text-lg">
              Understand what the Ayat are talking about.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border-2 border-blue-100 p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Select Your Age Group</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {(['6-8', '9-11', '12-14'] as AgeGroup[]).map(age => (
                <button
                  key={age}
                  onClick={() => setAgeGroup(age)}
                  className="p-6 rounded-2xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🕌</div>
                  <div className="font-bold text-gray-700 group-hover:text-blue-700">Age {age}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Button variant="outline" onClick={() => setAgeGroup(null)}>
            ← Change Age
          </Button>
          <div className="text-blue-800 font-bold flex items-center gap-2">
            <Book size={20} />
            <span>Quran Context ({ageGroup})</span>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((q, index) => {
            const isAnswered = selectedOptions[q.id] !== undefined;
            const isCorrect = feedback[q.id];

            return (
              <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                <div className="bg-blue-600 p-6 text-white text-center">
                  <div className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">{q.surahReference}</div>
                  <h3 className="text-xl md:text-2xl font-serif leading-relaxed">
                    {q.ayatText}
                  </h3>
                </div>

                <div className="p-6">
                  <h4 className="font-bold text-gray-700 mb-3 text-center">
                    What is this Ayat talking about?
                  </h4>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    {q.options.map((opt, idx) => {
                      const isSelected = selectedOptions[q.id] === idx;
                      const isThisCorrect = idx === q.correctAnswer;
                      
                      let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all relative ";
                      
                      if (isAnswered) {
                        if (isThisCorrect) {
                           btnClass += "border-green-500 bg-green-50 text-green-800";
                        } else if (isSelected && !isThisCorrect) {
                           btnClass += "border-red-500 bg-red-50 text-red-800";
                        } else {
                           btnClass += "border-gray-100 opacity-50";
                        }
                      } else {
                        btnClass += "border-gray-100 hover:border-blue-300 hover:bg-blue-50";
                      }

                      return (
                        <button
                          key={idx}
                          disabled={isAnswered}
                          onClick={() => handleSelect(q.id, idx, isThisCorrect)}
                          className={btnClass}
                        >
                          <span className="block text-center">{opt}</span>
                          {isAnswered && isThisCorrect && (
                            <CheckCircle className="absolute right-2 top-2 text-green-600" size={16} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div className={`mt-4 p-4 rounded-lg text-sm ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
                      <strong>Explanation: </strong> {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
