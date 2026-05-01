
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AGE_GROUPS, AgeGroup } from '@/data/age-specific-content';
import { Button } from '@/components';
import { BookOpen, Star, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function HadithPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, boolean>>({});

  // Auto-select age if available from profile
  // (In a real app we might want to let them override or confirm)
  // useEffect(() => {
  //   if (profile?.age) {
  //      // map profile age to group
  //   }
  // }, [profile]);

  const hadiths = ageGroup ? AGE_GROUPS[ageGroup].hadiths : [];

  const handleSelect = (hadithId: string, optionId: string, isCorrect: boolean) => {
    setSelectedOptions(prev => ({ ...prev, [hadithId]: optionId }));
    setFeedback(prev => ({ ...prev, [hadithId]: isCorrect }));
  };

  if (!ageGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => router.push('/games')}>
              ← Back to Games
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              Home
            </Button>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-emerald-800 mb-4 islamic-shadow">
              📖 Hadith Quiz
            </h1>
            <p className="text-emerald-600 text-lg">
              Learn wisdom from the Prophet (SAW) tailored for you.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border-2 border-emerald-100 p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Select Your Age Group</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {(['6-8', '9-11', '12-14'] as AgeGroup[]).map(age => (
                <button
                  key={age}
                  onClick={() => setAgeGroup(age)}
                  className="p-6 rounded-2xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🌟</div>
                  <div className="font-bold text-gray-700 group-hover:text-emerald-700">Age {age}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/games')}>
              ← Games
            </Button>
            <Button variant="outline" onClick={() => setAgeGroup(null)}>
              Change Age
            </Button>
          </div>
          <div className="text-emerald-800 font-bold flex items-center gap-2">
            <BookOpen size={20} />
            <span>Hadith Quiz ({ageGroup})</span>
          </div>
        </div>

        <div className="space-y-6">
          {hadiths.map((hadith, index) => {
            const isAnswered = !!selectedOptions[hadith.id];
            const isCorrect = feedback[hadith.id];

            return (
              <div key={hadith.id} className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                <div className="bg-emerald-600 p-4 text-white">
                  <div className="flex justify-between items-start">
                    <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Hadith {index + 1}</span>
                    <span className="bg-emerald-700 px-2 py-0.5 rounded text-xs text-emerald-100">{hadith.source}</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-serif mt-2 leading-relaxed">
                    {hadith.text}
                  </h3>
                </div>

                <div className="p-6">
                  <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                    🤔 What can we learn from this?
                  </h4>
                  
                  <div className="space-y-3">
                    {hadith.reflectionOptions.map(opt => {
                      const isSelected = selectedOptions[hadith.id] === opt.id;
                      let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all relative ";
                      
                      if (isAnswered) {
                        if (opt.isCorrect) {
                           btnClass += "border-green-500 bg-green-50 text-green-800";
                        } else if (isSelected && !opt.isCorrect) {
                           btnClass += "border-red-500 bg-red-50 text-red-800";
                        } else {
                           btnClass += "border-gray-100 opacity-50";
                        }
                      } else {
                        btnClass += "border-gray-100 hover:border-emerald-300 hover:bg-emerald-50";
                      }

                      return (
                        <button
                          key={opt.id}
                          disabled={isAnswered}
                          onClick={() => handleSelect(hadith.id, opt.id, opt.isCorrect)}
                          className={btnClass}
                        >
                          <span className="pr-8 block">{opt.text}</span>
                          {isAnswered && opt.isCorrect && (
                            <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600" size={20} />
                          )}
                          {isAnswered && isSelected && !opt.isCorrect && (
                            <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-600" size={20} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div className={`mt-4 p-4 rounded-lg text-sm ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
                      <strong>Explanation: </strong> {hadith.explanation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 text-center">
           <p className="text-emerald-600 mb-4">Complete all reflections to understand the wisdom!</p>
        </div>
      </div>
    </div>
  );
}
