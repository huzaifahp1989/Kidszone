'use client';

import React, { useState } from 'react';
import { quranSurahs, lastTenSurahs } from '@/data/quran';
import { Button, Modal } from '@/components';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function QuranPage() {
  const allSurahs = [...quranSurahs, ...lastTenSurahs];
  const [selectedSurah, setSelectedSurah] = useState(allSurahs[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedAyahs, setExpandedAyahs] = useState<number[]>([]);

  const toggleAyah = (ayahNumber: number) => {
    setExpandedAyahs(prev =>
      prev.includes(ayahNumber)
        ? prev.filter(a => a !== ayahNumber)
        : [...prev, ayahNumber]
    );
  };

  const handleSelectSurah = (surah: any) => {
    setSelectedSurah(surah);
    setExpandedAyahs([]);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-islamic-light to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-islamic-dark mb-2 islamic-shadow">
            📖 Learn Quran
          </h1>
          <p className="text-lg text-gray-600">
            Discover the beauty of the Quran with easy meanings for kids!
          </p>
        </div>

        {/* Surah Selection */}
        <div className="mb-8">
          <Button
            onClick={() => setIsModalOpen(true)}
            size="lg"
            className="w-full"
          >
            📚 Choose a Surah: {selectedSurah.englishName}
          </Button>
        </div>

        {/* Surah Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Choose a Surah to Learn"
          size="lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {allSurahs.map(surah => (
              <button
                key={surah.id}
                onClick={() => handleSelectSurah(surah)}
                className="text-left p-4 border-2 border-islamic-blue rounded-lg hover:bg-blue-100 transition"
              >
                <p className="font-bold text-islamic-blue">
                  Surah {surah.number}: {surah.englishName}
                </p>
                <p className="text-sm text-gray-600">{surah.arabicName}</p>
              </button>
            ))}
          </div>
        </Modal>

        {/* Surah Content */}
        {selectedSurah && (
          <div className="space-y-6">
            {/* Surah Header */}
            <div className="bg-gradient-to-r from-islamic-blue to-islamic-green text-white p-8 rounded-2xl">
              <div className="text-right mb-4">
                <h2 className="text-4xl font-bold arabic-font">{selectedSurah.arabicName}</h2>
                <p className="text-lg">Surah {selectedSurah.number}</p>
              </div>
              <h1 className="text-3xl font-bold mb-4">{selectedSurah.englishName}</h1>
              <p className="text-lg leading-relaxed">{selectedSurah.intro}</p>
            </div>

            {/* Key Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-yellow-50 border-l-4 border-islamic-gold p-6 rounded-lg">
                <h3 className="font-bold text-islamic-gold mb-3 text-lg">📌 Main Lesson</h3>
                <p className="text-gray-700">{selectedSurah.mainLesson}</p>
              </div>
              <div className="bg-sky-50 border-l-4 border-islamic-green p-6 rounded-lg">
                <h3 className="font-bold text-islamic-green mb-3 text-lg">✨ Why We Read It</h3>
                <p className="text-gray-700">{selectedSurah.whyRead}</p>
              </div>
            </div>

            {/* Did You Know */}
            {selectedSurah.facts.length > 0 && (
              <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
                <h3 className="font-bold text-purple-700 mb-3 text-lg">🤔 Did You Know?</h3>
                <ul className="space-y-2">
                  {selectedSurah.facts.map((fact, idx) => (
                    <li key={idx} className="text-gray-700 flex items-start gap-2">
                      <span className="text-purple-500 mt-1">▪</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ayahs */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-islamic-dark mb-4">📖 Read the Verses</h3>
              {selectedSurah.ayahs.slice(0, 10).map(ayah => (
                <div
                  key={ayah.number}
                  className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-islamic-blue transition"
                >
                  <button
                    onClick={() => toggleAyah(ayah.number)}
                    className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition"
                  >
                    <div className="text-left flex-1">
                      <p className="text-right font-arabic text-2xl mb-2 text-islamic-blue">
                        {ayah.arabic}
                      </p>
                      <p className="text-sm text-gray-600">Verse {ayah.number}</p>
                    </div>
                    <div className="ml-4">
                      {expandedAyahs.includes(ayah.number) ? (
                        <ChevronUp className="text-islamic-blue" />
                      ) : (
                        <ChevronDown className="text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  {expandedAyahs.includes(ayah.number) && (
                    <div className="px-4 pb-4 border-t-2 border-gray-200 bg-blue-50">
                      <p className="text-base leading-relaxed text-gray-800">
                        <strong>Meaning:</strong> {ayah.english}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button variant="success" size="lg" className="flex-1">
                ✓ Mark as Read
              </Button>
              <Button variant="primary" size="lg" className="flex-1">
                📝 Take Quiz on This
              </Button>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border-l-4 border-islamic-blue p-6 rounded-lg">
              <h4 className="font-bold text-islamic-blue mb-3">💡 Learning Tip</h4>
              <p className="text-gray-700">
                Try to read each Ayah carefully. Click on each verse to see its easy meaning.
                Read slowly and think about what each verse teaches us. Reading Quran brings
                peace and brings us closer to Allah! 📖✨
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
