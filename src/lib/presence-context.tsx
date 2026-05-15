'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type PresenceContextType = {
  onlineUserIds: Set<string>;
};

const PresenceContext = createContext<PresenceContextType | null>(null);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const { profile } = useAuth();

  useEffect(() => {
    const presenceChannel = supabase.channel('global-presence', { config: { broadcast: { self: true } } });
    
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const activeUsers = new Set<string>();
      
      Object.entries(state).forEach(([userId, presences]) => {
        if (Array.isArray(presences) && presences.length > 0) {
          activeUsers.add(userId);
        }
      });
      
      setOnlineUserIds(activeUsers);
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && profile?.uid) {
        await presenceChannel.track({ uid: profile.uid, name: profile.name, timestamp: Date.now() });
      }
    });

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [profile?.uid, profile?.name]);

  return (
    <PresenceContext.Provider value={{ onlineUserIds }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence must be used within PresenceProvider');
  }
  return context;
}
