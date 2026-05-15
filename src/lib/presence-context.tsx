'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// Pages that are NOT part of the kids zone
const NON_KIDS_ZONE_PREFIXES = ['/admin', '/signin', '/signup', '/reset-password'];

function isKidsZonePath(path: string): boolean {
  return !NON_KIDS_ZONE_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}

type PresenceContextType = {
  onlineUserIds: Set<string>;
};

const PresenceContext = createContext<PresenceContextType | null>(null);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const { profile } = useAuth();
  const pathname = usePathname();
  const presenceChannelRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clean up old channel and heartbeat if they exist
    if (presenceChannelRef.current) {
      presenceChannelRef.current.unsubscribe();
      presenceChannelRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Only create a new channel if user is logged in
    if (!profile?.uid) {
      return;
    }

    // Key the channel by profile.uid so presenceState() is keyed by uid
    const presenceChannel = supabase.channel('kids-zone-presence', {
      config: { presence: { key: profile.uid } },
    });
    presenceChannelRef.current = presenceChannel;

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState<{ uid: string; zone: string }>();
      const activeUsers = new Set<string>();

      Object.entries(state).forEach(([uid, presences]) => {
        if (Array.isArray(presences) && presences.length > 0) {
          const latest = presences[presences.length - 1];
          // Only count users who are on a kids zone page
          if (latest.zone && isKidsZonePath(latest.zone)) {
            activeUsers.add(uid);
          }
        }
      });

      setOnlineUserIds(activeUsers);
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ uid: profile.uid, name: profile.name, zone: pathname, timestamp: Date.now() });

        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(async () => {
          await presenceChannel.track({ uid: profile.uid, name: profile.name, zone: pathname, timestamp: Date.now() });
        }, 30000);
      }
    });

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [profile?.uid, profile?.name, pathname]);

  // Cleanup heartbeat on unmount
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

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
