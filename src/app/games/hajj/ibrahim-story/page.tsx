'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { awardPoints as awardPointsRpc } from '@/lib/points-service';
import { useAuth } from '@/lib/auth-context';

interface Chapter {
  icon: string;
  title: string;
  text: string;
  question?: { q: string; options: string[]; correct: number; explanation: string };
}

const chapters: Chapter[] = [
  {
    icon: '🌄',
    title: "Allah\u2019s Command",
    text: `Long ago, Allah (SWT) commanded Prophet Ibrahim (AS) to take his wife Hagar (RA) and their baby son Ismail (AS) to a dry, empty valley far away — the valley that would one day become the city of Makkah. There were no trees, no water, and no people there — only sand and rocks under a hot sun.`,
  },
  {
    icon: '🏜️',
    title: 'Trust in Allah',
    text: `Ibrahim (AS) left Hagar and little Ismail there with only a small bag of dates and some water. As he turned to leave, Hagar asked: "Has Allah commanded you to do this?" Ibrahim (AS) nodded yes. She replied: "Then Allah will not abandon us." This beautiful trust in Allah is one of the greatest lessons of Hajj.`,
    question: {
      q: 'What did Hagar (RA) say when Ibrahim (AS) was leaving?',
      options: [
        '"Please don\'t go!"',
        '"Then Allah will not abandon us."',
        '"We need more water first."',
        '"Where are the other people?"',
      ],
      correct: 1,
      explanation:
        'Hagar (RA) showed perfect trust in Allah. She knew that if Allah commanded it, He would take care of them.',
    },
  },
  {
    icon: '🏃‍♀️',
    title: 'Searching for Water',
    text: `When the water ran out, Hagar (RA) became very worried for baby Ismail. She ran to the top of a hill called Safa to look for water. She saw nothing. She ran to the top of a second hill called Marwah. She saw nothing. She ran back and forth between the two hills — seven times in total — desperately searching for water or help.`,
    question: {
      q: 'Why do Muslims walk between Safa and Marwah during Hajj?',
      options: [
        'Because it is the shortest route',
        'To remember Hagar (RA) searching for water',
        'Because there is a beautiful view',
        'To exercise and stay healthy',
      ],
      correct: 1,
      explanation:
        'We perform Sa\'i (walking between Safa & Marwah) to honour and remember Hagar\'s brave search for water for her baby.',
    },
  },
  {
    icon: '💧',
    title: 'The Miracle of Zamzam',
    text: `On her seventh trip, something miraculous happened! Baby Ismail tapped his heel on the ground — and suddenly water burst up from the earth! This was the blessed Zamzam well. Birds began to circle the spot. A tribe called the Jurhum saw the birds and came to investigate. They found Hagar and Ismail, asked permission to settle nearby, and gradually a city began to grow around the well of Zamzam.`,
    question: {
      q: 'What is the name of the miraculous water that appeared in Makkah?',
      options: ['River Nile', 'Euphrates', 'Zamzam', 'Kawthar'],
      correct: 2,
      explanation:
        'Zamzam is the blessed water that has flowed for thousands of years in Makkah. Pilgrims still drink from it today during Hajj and Umrah.',
    },
  },
  {
    icon: '🕋',
    title: 'Building the Kaaba',
    text: `Years passed and Ismail grew up. Allah (SWT) commanded Ibrahim (AS) to return to Makkah and rebuild the House of Allah — the Kaaba. Father and son worked together to build it with stones. As they built, they prayed: "Our Lord, accept this from us. You are the All-Hearing, All-Knowing." They placed the sacred Black Stone (Hajar al-Aswad) in the eastern corner, just as it is today.`,
  },
  {
    icon: '🐑',
    title: 'The Greatest Sacrifice',
    text: `Allah (SWT) tested Ibrahim (AS) in the most difficult way. He showed Ibrahim in a dream that he was sacrificing his beloved son Ismail. Ibrahim told Ismail about the dream. Ismail replied: "Father, do what Allah commands. You will find me patient, insha'Allah." As Ibrahim (AS) was about to carry out the command, Allah called out to stop him! Allah was pleased with their obedience and sent a ram to be sacrificed instead. This is why Muslims sacrifice animals on Eid al-Adha — to remember this great act of obedience.`,
    question: {
      q: 'Which Eid celebrates the memory of Ibrahim\'s willingness to sacrifice?',
      options: ['Eid al-Fitr', 'Eid Milad un Nabi', 'Eid al-Adha', 'Laylat al-Qadr'],
      correct: 2,
      explanation:
        'Eid al-Adha (the Festival of Sacrifice) is celebrated on the 10th of Dhul Hijjah to remember Ibrahim\'s and Ismail\'s complete obedience to Allah.',
    },
  },
  {
    icon: '📣',
    title: 'The Call to Hajj',
    text: `After completing the Kaaba, Allah commanded Ibrahim (AS): "Call the people to Hajj! They will come on foot and on every lean camel from every distant mountain pass." Ibrahim raised his voice and that call reached every soul. This is why Muslims from every corner of the world still answer the call today — saying "Labbayk Allahumma Labbayk" — Here I am, O Allah, here I am! 🤲`,
  },
];

export default function IbrahimStoryGame() {
  const router = useRouter();
  const { user } = useAuth() as any;
  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const chapter = chapters[step];
  const hasQ = Boolean(chapter.question);
  const canProceed = !hasQ || answered !== null;

  // Award points when the story is completed
  useEffect(() => {
    if (done && user?.id) {
      awardPointsRpc(30).catch(() => {});
    }
  }, [done, user]);

  const handleAnswer = (idx: number) => {
    if (answered !== null) return;
    setAnswered(idx);
    setShowExplanation(true);
    if (idx === chapter.question!.correct) setCorrectCount((c) => c + 1);
  };

  const next = () => {
    if (step + 1 >= chapters.length) {
      setDone(true);
      return;
    }
    setStep((s) => s + 1);
    setAnswered(null);
    setShowExplanation(false);
  };

  const restart = () => {
    setStep(0);
    setAnswered(null);
    setShowExplanation(false);
    setCorrectCount(0);
    setDone(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white p-6 pb-20 flex items-center justify-center">
        <div className="max-w-sm w-full bg-white rounded-3xl p-8 shadow-lg text-center border border-amber-200">
          <div className="text-7xl mb-3">📜</div>
          <h2 className="text-3xl font-black text-amber-800 mb-2">Story Complete!</h2>
          <p className="text-gray-600 mb-4 text-lg">
            You answered <span className="font-bold text-amber-700">{correctCount}</span> out of{' '}
            <span className="font-bold">{chapters.filter((c) => c.question).length}</span> questions correctly!
          </p>
          <p className="text-amber-700 font-bold text-sm mb-2">+30 points awarded! 🌟</p>
          <p className="text-gray-500 text-sm mb-6">
            SubhanAllah — the story of Ibrahim (AS) is the foundation of Hajj. May Allah grant us all the opportunity to perform Hajj. 🤲
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={restart} className="bg-amber-500 text-white font-bold px-6 py-3 rounded-2xl hover:bg-amber-600">
              ↺ Read Again
            </button>
            <button onClick={() => router.back()} className="bg-gray-100 text-gray-700 font-bold px-6 py-3 rounded-2xl hover:bg-gray-200">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white p-4 pb-20">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-amber-700 mb-4 font-bold">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Progress */}
      <div className="flex items-center justify-between mb-4 max-w-xl mx-auto">
        <span className="text-sm text-amber-700 font-bold">
          Chapter {step + 1} / {chapters.length}
        </span>
        <div className="flex gap-1">
          {chapters.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i < step ? 'w-6 bg-amber-500' : i === step ? 'w-8 bg-amber-700' : 'w-6 bg-amber-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Chapter card */}
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 shadow-lg border border-amber-100">
        <div className="text-6xl text-center mb-3">{chapter.icon}</div>
        <h2 className="text-2xl font-black text-amber-800 text-center mb-4">{chapter.title}</h2>
        <p className="text-gray-700 leading-relaxed text-base">{chapter.text}</p>

        {/* Question */}
        {chapter.question && (
          <div className="mt-6 bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <p className="font-bold text-amber-800 mb-3">❓ {chapter.question.q}</p>
            <div className="space-y-2">
              {chapter.question.options.map((opt, i) => {
                let cls =
                  'w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ';
                if (answered === null) {
                  cls += 'border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-50 cursor-pointer';
                } else if (i === chapter.question!.correct) {
                  cls += 'border-green-500 bg-green-50 text-green-800';
                } else if (i === answered) {
                  cls += 'border-red-400 bg-red-50 text-red-700';
                } else {
                  cls += 'border-gray-200 bg-gray-50 text-gray-400';
                }
                return (
                  <button key={i} className={cls} onClick={() => handleAnswer(i)} disabled={answered !== null}>
                    {answered !== null && i === chapter.question!.correct && '✅ '}
                    {answered !== null && i === answered && i !== chapter.question!.correct && '❌ '}
                    {opt}
                  </button>
                );
              })}
            </div>
            {showExplanation && (
              <div
                className={`mt-3 p-3 rounded-xl text-sm font-medium ${
                  answered === chapter.question.correct
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                💡 {chapter.question.explanation}
              </div>
            )}
          </div>
        )}

        {/* Next button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={next}
            disabled={!canProceed}
            className={`font-black text-lg px-8 py-3 rounded-2xl transition-all ${
              canProceed
                ? 'bg-gradient-to-r from-amber-500 to-amber-700 text-white hover:opacity-90 active:scale-95 shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {step + 1 === chapters.length ? 'Finish 🎉' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
