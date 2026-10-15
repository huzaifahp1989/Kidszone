'use client';

import React, { useEffect, useState } from 'react';
import { CreateShell } from '@/components/CreateShell';
import {
  STORY_ADVENTURES,
  markCreateFinishedToday,
  getCreateFinishedToday,
} from '@/data/kids-create-activities';

export default function StoryAdventurePage() {
  const [storyId, setStoryId] = useState(STORY_ADVENTURES[0].id);
  const story = STORY_ADVENTURES.find((s) => s.id === storyId) || STORY_ADVENTURES[0];
  const [nodeId, setNodeId] = useState(story.startId);
  const [finishedToday, setFinishedToday] = useState<string[]>([]);
  const node = story.nodes[nodeId];

  useEffect(() => {
    setFinishedToday(getCreateFinishedToday());
  }, []);

  useEffect(() => {
    setNodeId(story.startId);
  }, [storyId, story.startId]);

  useEffect(() => {
    if (node?.ending) {
      markCreateFinishedToday(`story-${storyId}`);
      setFinishedToday(getCreateFinishedToday());
    }
  }, [node?.ending, storyId]);

  return (
    <CreateShell title="Story Adventure">
      <div className="flex flex-wrap gap-2">
        {STORY_ADVENTURES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStoryId(s.id)}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              storyId === s.id ? 'bg-teal-700 text-white' : 'border border-teal-200 bg-white text-teal-800'
            }`}
          >
            {s.title}
            {finishedToday.includes(`story-${s.id}`) ? ' ✓' : ''}
          </button>
        ))}
      </div>
      <p className="text-sm text-sand-600">Choose what happens next. Good manners lead to beautiful endings!</p>
      <div className="surface-card space-y-4 rounded-3xl p-5 sm:p-6">
        <h2 className="text-lg font-black text-teal-900">{story.title}</h2>
        <p className="text-lg font-semibold leading-relaxed text-sand-900">{node.text}</p>
        <div className="grid gap-2">
          {node.choices.map((choice) => (
            <button
              key={choice.label}
              type="button"
              onClick={() => setNodeId(choice.next)}
              className="rounded-2xl border-2 border-teal-200 bg-white px-4 py-3 text-left font-bold text-teal-900 transition hover:bg-teal-50"
            >
              {choice.label}
            </button>
          ))}
        </div>
        {node.ending && (
          <div className="space-y-2">
            <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800">
              ✓ Story sticker saved for today!
            </p>
            <button
              type="button"
              onClick={() => setNodeId(story.startId)}
              className="text-sm font-bold text-teal-700 underline"
            >
              Play again
            </button>
          </div>
        )}
      </div>
    </CreateShell>
  );
}
