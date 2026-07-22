'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AGE_GROUPS, AgeGroup } from '@/data/age-specific-content';
import { Button } from '@/components';
import { BookOpen, Star, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { authJsonFetch } from '@/lib/auth-headers';

export default function HadithPage() {
  const router = useRouter();
  const { user, refreshProfile, updateLocalProfile } = useAuth();
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, boolean>>({});
  const [pointsMessage, setPointsMessage] = useState<string | null>(null);
  const [claimingPoints, setClaimingPoints] = useState(false);
  const pointsClaimedRef = useRef(false);

  const hadiths = ageGroup ? AGE_GROUPS[ageGroup].hadiths : [];
  const allAnswered = hadiths.length > 0 && hadiths.every((h) => Boolean(selectedOptions[h.id]));

  useEffect(() => {
    pointsClaimedRef.current = false;
    setPointsMessage(null);
  }, [ageGroup]);

  useEffect(() => {
    if (!allAnswered || !user?.id || pointsClaimedRef.current) return;
    pointsClaimedRef.current = true;
    setClaimingPoints(true);
    authJsonFetch('/api/activities/complete', {
      method: 'POST',
      timeoutMs: 20_000,
      body: JSON.stringify({ userId: user.id, activity: 'hadith' }),
    })
      .then(async (res) => ({ res, data: await res.json() }))
      .then(({ res, data }) => {
        if (res.status === 401) {
          setPointsMessage('Please sign in again to save your points.');
          pointsClaimedRef.current = false;
          return;
        }
        if (data.pointsAwarded > 0) {
          setPointsMessage(`⭐ +${data.pointsAwarded} points for completing Hadith learning today!`);
          if (data.profile) {
            updateLocalProfile?.({
              points: Number(data.profile.points ?? 0),
              weeklyPoints: Number(data.profile.weeklyPoints ?? 0),
              monthlyPoints: Number(data.profile.monthlyPoints ?? 0),
              todayPoints: Number(data.profile.todayPoints ?? 0),
            });
          }
          void refreshProfile?.();
        } else {
          setPointsMessage(data.message || 'Session complete!');
        }
      })
      .catch(() => setPointsMessage('Could not save points. Try again.'))
      .finally(() => setClaimingPoints(false));
  }, [allAnswered, user?.id, refreshProfile, updateLocalProfile]);

  const handleSelect = (hadithId: string, optionId: string, isCorrect: boolean) => {
    setSelectedOptions(prev => ({ ...prev, [hadithId]: optionId }));
    setFeedback(prev => ({ ...prev, [hadithId]: isCorrect }));
  };

  if (!ageGroup) {
    return (
      <div className="page-inner">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => router.push('/hadith')}>
              ← Daily Hadith
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              Home
            </Button>
          </div>
          
          <div className="page-header">
            <h1>📖 Hadith Quiz</h1>
            <p>Learn wisdom from the Prophet (SAW) tailored for you.</p>
          </div>

          <div className="surface-card rounded-3xl p-8">
            <h3 className="section-title">Select Your Age Group</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {(['6-8', '9-11', '12-14'] as AgeGroup[]).map(age => (
                <button
                  key={age}
                  onClick={() => setAgeGroup(age)}
                  className="feature-tile group rounded-2xl p-6 transition-all"
                >
                  <div className="mb-2 text-3xl transition-transform group-hover:scale-110">🌟</div>
                  <div className="font-bold text-sand-800 group-hover:text-teal-700">Age {age}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/hadith')}>
              ← Daily Hadith
            </Button>
            <Button variant="outline" onClick={() => setAgeGroup(null)}>
              Change Age
            </Button>
          </div>
          <div className="flex items-center gap-2 font-bold text-teal-800">
            <BookOpen size={20} />
            <span>Hadith Quiz ({ageGroup})</span>
          </div>
        </div>

        <div className="space-y-6">
          {hadiths.map((hadith, index) => {
            const isAnswered = !!selectedOptions[hadith.id];
            const isCorrect = feedback[hadith.id];

            return (
              <div key={hadith.id} className="surface-card overflow-hidden rounded-2xl">
                <div className="bg-gradient-to-r from-teal-700 to-teal-600 p-4 text-white">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-100">Hadith {index + 1}</span>
                    <span className="rounded bg-teal-800/60 px-2 py-0.5 text-xs text-teal-100">{hadith.source}</span>
                  </div>
                  <h3 className="font-heading mt-2 text-lg leading-relaxed md:text-xl">
                    {hadith.text}
                  </h3>
                </div>

                <div className="p-6">
                  <h4 className="mb-3 flex items-center gap-2 font-bold text-sand-800">
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
                        btnClass += "border-sand-200 hover:border-teal-300 hover:bg-teal-50/50";
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
        
        <div className="mt-8 text-center space-y-3">
          {allAnswered ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
              <p className="font-bold text-teal-900">MashaAllah! All reflections complete.</p>
              <p className="mt-1 text-sm text-teal-800">
                {claimingPoints
                  ? 'Saving points…'
                  : pointsMessage ||
                    `Earn +${ACTIVITY_BONUS_POINTS} points once per day for completing Hadith learning.`}
              </p>
            </div>
          ) : (
            <p className="mb-4 text-teal-700">
              Complete all reflections to earn +{ACTIVITY_BONUS_POINTS} points (once per day).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
