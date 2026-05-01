"use client";

import React from 'react';

const messages = [
  "🌟 Play today's quiz and earn points!",
  "🕌 Learn a new Surah every day!",
  "🏆 Check the leaderboard — can you reach the top?",
  "📖 Read a story and discover Islamic history!",
  "🎮 New games waiting for you — jump in!",
  "⭐ Complete your daily missions for bonus points!",
  "🌙 Learn the 99 Names of Allah — how many do you know?",
  "🎯 Challenge yourself with the Quran Quiz!",
  "🤝 Invite a friend and learn together!",
  "💎 Collect badges by completing activities!",
  "🌸 Say Bismillah and start learning today!",
  "🏅 Top scorers earn special rewards — play now!",
  "📿 Recite and record your Quran — earn stars!",
  "🌍 Join kids from around the world learning Islam!",
  "✨ Every good deed counts — keep going!",
];

export function ScrollingTicker() {
  // Duplicate messages so the scroll feels continuous
  const doubled = [...messages, ...messages];

  return (
    <div className="scrolling-ticker-wrap overflow-hidden bg-gradient-to-r from-kids-primary via-kids-secondary to-kids-primary text-white py-2 relative">
      <div className="scrolling-ticker-track flex whitespace-nowrap" style={{ animation: 'tickerScroll 60s linear infinite' }}>
        {doubled.map((msg, i) => (
          <span key={i} className="inline-block mx-8 text-sm font-bold tracking-wide shrink-0">
            {msg}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .scrolling-ticker-wrap:hover .scrolling-ticker-track {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
