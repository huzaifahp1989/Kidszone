'use client';

import { useParams } from 'next/navigation';
import { WordSearchGame } from '@/components/WordSearchGame';
import { ramadanWordSearch, seerahWordSearch, quranWordSearch } from '@/data/games';

const THEMES = {
  ramadan: { title: 'Ramadan', emoji: '🌙', config: ramadanWordSearch },
  seerah: { title: 'Seerah', emoji: '📜', config: seerahWordSearch },
  quran: { title: 'Quran', emoji: '📖', config: quranWordSearch },
} as const;

export default function WordSearchThemePage() {
  const params = useParams();
  const theme = String(params?.theme || '') as keyof typeof THEMES;
  const meta = THEMES[theme];

  if (!meta) {
    return (
      <div className="page-inner text-center">
        <p className="text-sand-700">Unknown word hunt theme.</p>
      </div>
    );
  }

  return (
    <WordSearchGame
      themeId={theme}
      title={meta.title}
      emoji={meta.emoji}
      config={meta.config}
    />
  );
}
