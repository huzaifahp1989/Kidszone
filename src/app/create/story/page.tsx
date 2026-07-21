'use client';

import React, { useState } from 'react';
import { CreateShell } from '@/components/CreateShell';
import { STORY_ADVENTURE } from '@/data/kids-create-activities';

export default function StoryAdventurePage() {
  const [nodeId, setNodeId] = useState(STORY_ADVENTURE.startId);
  const node = STORY_ADVENTURE.nodes[nodeId];

  return (
    <CreateShell title={STORY_ADVENTURE.title}>
      <p className="text-sm text-sand-600">Choose what happens next. Good manners lead to beautiful endings!</p>
      <div className="surface-card space-y-4 rounded-3xl p-5 sm:p-6">
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
          <button
            type="button"
            onClick={() => setNodeId(STORY_ADVENTURE.startId)}
            className="text-sm font-bold text-teal-700 underline"
          >
            Play again
          </button>
        )}
      </div>
    </CreateShell>
  );
}
