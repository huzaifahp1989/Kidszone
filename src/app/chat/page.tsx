'use client';

import React from 'react';
import { ChatWidget } from '@/components/ChatWidget';

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <ChatWidget variant="page" />
    </div>
  );
}
