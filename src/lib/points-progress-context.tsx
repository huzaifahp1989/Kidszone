'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

export type PointsActivity = 'quiz' | 'game' | 'pledge' | 'durood' | 'mission' | 'other';

export type PointsProgressPayload = {
  activity: PointsActivity;
  activityLabel: string;
  pointsEarned: number;
  message?: string;
};

type PointsProgressContextValue = {
  showPointsProgress: (payload: PointsProgressPayload) => void;
  hidePointsProgress: () => void;
  payload: PointsProgressPayload | null;
  isOpen: boolean;
};

const PointsProgressContext = createContext<PointsProgressContextValue>({
  showPointsProgress: () => {},
  hidePointsProgress: () => {},
  payload: null,
  isOpen: false,
});

export function PointsProgressProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<PointsProgressPayload | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showPointsProgress = useCallback((next: PointsProgressPayload) => {
    setPayload(next);
    setIsOpen(true);
  }, []);

  const hidePointsProgress = useCallback(() => {
    setIsOpen(false);
    setPayload(null);
  }, []);

  return (
    <PointsProgressContext.Provider value={{ showPointsProgress, hidePointsProgress, payload, isOpen }}>
      {children}
    </PointsProgressContext.Provider>
  );
}

export function usePointsProgress() {
  return useContext(PointsProgressContext);
}
