'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/lib/auth-context';

export type AgeMode = 'younger' | 'older';

/** Children at or below this age default to the simpler "younger" experience. */
export const YOUNGER_MAX_AGE = 8;
const STORAGE_KEY = 'kidszone.ageMode';

interface AgeModeContextValue {
  /** The mode currently in effect (manual override wins over age-derived). */
  mode: AgeMode;
  isYounger: boolean;
  /** Mode derived purely from the child's age (fallback when no override). */
  autoMode: AgeMode;
  /** Whether the user has manually chosen a mode. */
  hasOverride: boolean;
  setMode: (mode: AgeMode) => void;
  /** Remove the manual override and fall back to the age-derived mode. */
  clearOverride: () => void;
}

const AgeModeContext = createContext<AgeModeContextValue>({
  mode: 'older',
  isYounger: false,
  autoMode: 'older',
  hasOverride: false,
  setMode: () => {},
  clearOverride: () => {},
});

function deriveAutoMode(age: number | undefined | null): AgeMode {
  if (typeof age === 'number' && Number.isFinite(age) && age > 0 && age <= YOUNGER_MAX_AGE) {
    return 'younger';
  }
  return 'older';
}

export function AgeModeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [override, setOverride] = useState<AgeMode | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeUid, setActiveUid] = useState<string | null>(null);

  // Load any saved override once on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'younger' || saved === 'older') {
        setOverride(saved);
      }
    } catch {
      // localStorage unavailable (private mode / SSR) - ignore.
    }
    setHydrated(true);
  }, []);

  // When switching learners (siblings), prefer that child's age until they set a new override.
  useEffect(() => {
    const nextUid = profile?.uid ?? null;
    if (!nextUid || nextUid === activeUid) return;
    setActiveUid(nextUid);
    setOverride(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [profile?.uid, activeUid]);

  const autoMode = useMemo(() => deriveAutoMode(profile?.age), [profile?.age]);
  const mode: AgeMode = override ?? autoMode;

  const setMode = useCallback((next: AgeMode) => {
    setOverride(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore write failures
    }
  }, []);

  const clearOverride = useCallback(() => {
    setOverride(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Reflect the mode on the document root so global CSS can scale text.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (mode === 'younger') {
      root.classList.add('age-younger');
    } else {
      root.classList.remove('age-younger');
    }
    return () => {
      root.classList.remove('age-younger');
    };
  }, [mode, hydrated]);

  const value = useMemo<AgeModeContextValue>(
    () => ({
      mode,
      isYounger: mode === 'younger',
      autoMode,
      hasOverride: override !== null,
      setMode,
      clearOverride,
    }),
    [mode, autoMode, override, setMode, clearOverride],
  );

  return <AgeModeContext.Provider value={value}>{children}</AgeModeContext.Provider>;
}

export function useAgeMode(): AgeModeContextValue {
  return useContext(AgeModeContext);
}
