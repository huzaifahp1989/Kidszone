"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { ensureUserProfile } from '@/lib/user-profile';
import { supabase } from '@/lib/supabase';
import { mobileAuthHelper } from '@/lib/mobile-auth';

type KidProfile = {
  uid: string;
  role: 'kid' | 'admin' | string;
  name: string;
  username?: string;
  age: number;
  city?: string;
  madrasahName?: string;
  contactNumber?: string;
  email: string;
  familyEmail?: string;
  points: number;
  weeklyPoints?: number;
  monthlyPoints?: number;
  todayPoints?: number;
  dailyLimit?: number;
  badges?: number;
  level: string;
  streak?: number;
  lastStreakUpdate?: string;
  isFlagged?: boolean;
  parentEmail?: string;
  reminderOptIn?: boolean;
  reminderFrequency?: 'daily' | '3x_week' | 'weekly';
  reminderLastSentAt?: string | null;
};

interface AuthContextValue {
  user: { id: string; email?: string | null } | null;
  profile: KidProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalProfile: (updates: Partial<KidProfile>) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
  updateLocalProfile: () => {},
});

import { POINTS_DAILY_CAP, resolveBasePoints, resolveTodayPoints } from './points-policy';

const POINTS_SELECT =
  'total_points, weekly_points, monthly_points, today_points, last_earned_date, badges, level';

const isPlaceholderName = (name: string | null | undefined): boolean => {
  if (!name) return true;
  const t = name.trim();
  if (!t) return true;
  return /^learner\b/i.test(t);
};

const getBestName = async (currentName: string | undefined | null, email: string | undefined | null) => {
  const { data: authData } = await supabase.auth.getUser();
  const meta = (authData?.user?.user_metadata as any) || {};
  const metaName = meta?.name || meta?.full_name || meta?.fullName || '';
  const best =
    (typeof metaName === 'string' && metaName.trim()) ? metaName.trim() :
    (typeof email === 'string' && email.includes('@')) ? email.split('@')[0] :
    '';
  if (!currentName || isPlaceholderName(currentName)) {
    return best || 'Friend';
  }
  return currentName;
};

const mapProfile = (userRow: any, pointsRow?: any): KidProfile => {
  const todayPoints = resolveTodayPoints(pointsRow?.today_points, pointsRow?.last_earned_date);
  const points = resolveBasePoints(pointsRow?.total_points, userRow.points);
  const weeklyPoints = resolveBasePoints(
    pointsRow?.weekly_points,
    userRow.weeklyPoints ?? userRow.weeklypoints
  );
  const monthlyPoints = resolveBasePoints(
    pointsRow?.monthly_points,
    userRow.monthlyPoints ?? userRow.monthlypoints
  );
  // Prioritize badges/level from pointsRow (users_points), fall back to userRow (users)
  const badges = pointsRow?.badges ?? userRow.badges ?? 0;
  const level = pointsRow?.level ? `Level ${pointsRow.level}` : (userRow.level || 'Beginner');

  return {
    uid: userRow.uid,
    role: userRow.role,
    name: userRow.name,
    username: userRow.username ? String(userRow.username) : undefined,
    age: typeof userRow.age === 'number' ? userRow.age : Number(userRow.age) || 0,
    city: String(userRow.city || userRow.town || userRow.location || '').trim() || undefined,
    madrasahName: userRow.madrasahName ?? userRow.madrasahname ?? userRow.madrasah_name,
    contactNumber: userRow.contactNumber ?? userRow.contactnumber ?? userRow.contact_number,
    email: userRow.email,
    familyEmail: userRow.family_email ?? userRow.familyEmail ?? undefined,
    points,
    weeklyPoints,
    monthlyPoints,
    todayPoints,
    dailyLimit: POINTS_DAILY_CAP,
    badges,
    level,
    streak: userRow.streak || 0,
    lastStreakUpdate: userRow.last_streak_update,
    isFlagged: userRow.is_flagged || false,
    parentEmail: userRow.parent_email ?? userRow.parentEmail,
    reminderOptIn: userRow.reminder_opt_in ?? userRow.reminderOptIn ?? false,
    reminderFrequency: userRow.reminder_frequency ?? userRow.reminderFrequency ?? 'weekly',
    reminderLastSentAt: userRow.reminder_last_sent_at ?? null,
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Define refreshProfile early so it can be used in effects
  const refreshProfile = useCallback(async () => {
    if (!user) return;

    console.log('Manually refreshing profile for:', user.id);

    // Prefer the service-role API. Browser anon reads of users_points often fail
    // under Cap/WebView RLS, which used to overwrite awarded points with stale totals.
    try {
      const [{ authJsonFetch }, { LIVE_APP_URL }] = await Promise.all([
        import('@/lib/auth-headers'),
        import('@/lib/app-url'),
      ]);
      const res = await authJsonFetch(`${LIVE_APP_URL.replace(/\/$/, '')}/api/me/points`, {
        method: 'GET',
        timeoutMs: 8_000,
      });
      if (res.ok) {
        const payload = await res.json().catch(() => ({}));
        const apiProfile = payload?.profile;
        if (apiProfile && Number.isFinite(Number(apiProfile.points))) {
          const finalName = await getBestName(apiProfile.name, apiProfile.email || user.email);
          setProfile((prev) => ({
            uid: user.id,
            role: apiProfile.role || prev?.role || 'kid',
            name: finalName || prev?.name || 'Friend',
            username: prev?.username,
            age: Number(apiProfile.age ?? prev?.age ?? 0),
            city: apiProfile.city ?? prev?.city,
            madrasahName: prev?.madrasahName,
            contactNumber: prev?.contactNumber,
            email: apiProfile.email || prev?.email || user.email || '',
            familyEmail: prev?.familyEmail,
            points: Math.max(Number(apiProfile.points), Number(prev?.points || 0)),
            weeklyPoints: Math.max(
              Number(apiProfile.weeklyPoints ?? prev?.weeklyPoints ?? 0),
              Number(prev?.weeklyPoints || 0)
            ),
            monthlyPoints: Math.max(
              Number(apiProfile.monthlyPoints ?? prev?.monthlyPoints ?? 0),
              Number(prev?.monthlyPoints || 0)
            ),
            todayPoints: Number(apiProfile.todayPoints ?? prev?.todayPoints ?? 0),
            dailyLimit: Number(apiProfile.dailyLimit ?? POINTS_DAILY_CAP),
            badges: Number(apiProfile.badges ?? prev?.badges ?? 0),
            level: String(apiProfile.level || prev?.level || 'Beginner'),
            streak: Number(apiProfile.streak ?? prev?.streak ?? 0),
            lastStreakUpdate: prev?.lastStreakUpdate,
            isFlagged: prev?.isFlagged,
            parentEmail: prev?.parentEmail,
            reminderOptIn: prev?.reminderOptIn,
            reminderFrequency: prev?.reminderFrequency,
            reminderLastSentAt: prev?.reminderLastSentAt,
          }));
          return;
        }
      }
    } catch (err) {
      console.warn('Authoritative points refresh failed, falling back to Supabase client:', err);
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', user.id)
      .maybeSingle();

    if (error) {
      console.error('Profile refresh error:', error.message);
    } else if (data) {
      const { data: pointsRow, error: pointsError } = await supabase
        .from('users_points')
        .select(POINTS_SELECT)
        .eq('user_id', user.id)
        .maybeSingle();

      if (pointsError) {
        console.warn('users_points fetch error on refresh:', pointsError.message);
      }

      const mapped = mapProfile(data, pointsRow);
      // If users_points was blocked by RLS, keep any higher local total instead of wiping.
      setProfile((prev) => {
        const finalPoints = Math.max(Number(mapped.points || 0), Number(prev?.points || 0));
        return {
          ...mapped,
          points: finalPoints,
          weeklyPoints: Math.max(Number(mapped.weeklyPoints || 0), Number(prev?.weeklyPoints || 0)),
          monthlyPoints: Math.max(Number(mapped.monthlyPoints || 0), Number(prev?.monthlyPoints || 0)),
          todayPoints: Math.max(Number(mapped.todayPoints || 0), Number(prev?.todayPoints || 0)),
        };
      });
    } else {
      console.log('No profile data found for user; ensuring default profile');
      const created = await ensureUserProfile(user.id);
      if (created) {
        const { data: refetched } = await supabase
          .from('users')
          .select('*')
          .eq('uid', user.id)
          .maybeSingle();

        if (refetched) {
          const { data: pointsRow, error: pointsError } = await supabase
            .from('users_points')
            .select(POINTS_SELECT)
            .eq('user_id', user.id)
            .maybeSingle();

          if (pointsError) {
            console.warn('users_points fetch error after ensure:', pointsError.message);
          }

          const mapped = mapProfile(refetched, pointsRow);
          setProfile(mapped);
        }
      }
    }
  }, [user]);

  const updateLocalProfile = useCallback((updates: Partial<KidProfile>) => {
    setProfile(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // First, try to get existing session
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        
        const sessionUser = sessionData.session?.user;
        const isInvalidRefresh =
          !!sessionErr?.message &&
          (sessionErr.message.includes('Refresh Token Not Found') || sessionErr.message.includes('Invalid Refresh Token'));

        if (isMounted && sessionUser) {
          setUser({ id: sessionUser.id, email: sessionUser.email });
          setLoading(false);
          return;
        }

        if (isInvalidRefresh) {
          await new Promise((r) => setTimeout(r, 200));
          const { data: retryData } = await supabase.auth.getSession();
          const retryUser = retryData.session?.user;
          if (isMounted && retryUser) {
            setUser({ id: retryUser.id, email: retryUser.email });
            setLoading(false);
            return;
          }
        }

        // Retry window to handle slower mobile/webview storage propagation
        // right after a successful sign-in redirect.
        for (let i = 0; i < 12; i++) {
          await new Promise((r) => setTimeout(r, 250));
          const { data: lateData } = await supabase.auth.getSession();
          const lateUser = lateData.session?.user;
          if (isMounted && lateUser) {
            setUser({ id: lateUser.id, email: lateUser.email });
            setLoading(false);
            return;
          }
        }

        // No session; stay signed out. UI can prompt to sign in.
        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        // Leave user null on error
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Also listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('Auth event:', event, 'Session:', session?.user?.id);
      if (isMounted) {
        const u = session?.user ? { id: session.user.id, email: session.user.email } : null;
        console.log('Auth state changed:', u?.id);
        setUser(u);
        
        // If user has a valid session event, ensure profile is loaded immediately.
        if (u && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          console.log('User signed in, loading profile...');
          try {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('uid', u.id)
              .maybeSingle();
            
            if (error) {
              console.error('Profile load error on sign in:', error);
              // Try to create profile if it doesn't exist
              const created = await ensureUserProfile(u.id);
              if (created) {
                const { data: newData } = await supabase
                  .from('users')
                  .select('*')
                  .eq('uid', u.id)
                  .maybeSingle();
                if (newData) {
                  const { data: pointsRow, error: pointsError } = await supabase
                    .from('users_points')
                    .select(POINTS_SELECT)
                    .eq('user_id', u.id)
                    .maybeSingle();
                  
                  if (pointsError) {
                    console.warn('users_points fetch error on sign in:', pointsError.message);
                  }
                  
                  const mapped = mapProfile(newData, pointsRow);
                  const finalName = await getBestName(mapped.name, mapped.email);
                  if (finalName !== mapped.name && finalName && !isPlaceholderName(finalName)) {
                    const { error: updateErr } = await supabase.from('users').update({ name: finalName }).eq('uid', u.id);
                    if (updateErr) {}
                  }
                  setProfile({ ...mapped, name: finalName });
                }
              }
            } else if (data) {
              const { data: pointsRow, error: pointsError } = await supabase
                .from('users_points')
                .select(POINTS_SELECT)
                .eq('user_id', u.id)
                .maybeSingle();
              
              if (pointsError) {
                console.warn('users_points fetch error on sign in:', pointsError.message);
              }
              
              const mapped = mapProfile(data, pointsRow);
              const finalName = await getBestName(mapped.name, mapped.email);
              if (finalName !== mapped.name && finalName && !isPlaceholderName(finalName)) {
                const { error: updateErr } = await supabase.from('users').update({ name: finalName }).eq('uid', u.id);
                if (updateErr) {}
              }
              setProfile({ ...mapped, name: finalName });
            }
          } catch (err) {
            console.error('Error loading profile on sign in:', err);
          }
        } else if (!u && event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    });

    return () => {
      isMounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Initial profile load
  useEffect(() => {
    (async () => {
      if (!user) {
        console.log('No user, clearing profile');
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      await refreshProfile();
      setLoading(false);
    })();
  }, [user, refreshProfile]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    
    console.log('Setting up real-time subscription for user:', user.id);
    const channel = supabase
      .channel(`user-profile-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `uid=eq.${user.id}`,
      }, (payload: any) => {
        console.log('Real-time update received (users):', payload);
        refreshProfile();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users_points',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        console.log('Real-time update received (users_points):', payload);
        refreshProfile();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshProfile]);

  // Re-fetch on window focus (vital for mobile app state consistency) - with debounce
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const handleFocus = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (user) {
          console.log('Window focused, refreshing profile...');
          refreshProfile();
        }
      }, 1000); // 1 second debounce
    };

    const handleVisibilityChange = () => {
      if (!user) return;
      if (document.visibilityState === 'visible') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log('Tab visible, refreshing profile...');
          refreshProfile();
        }, 1000); // 1 second debounce
      }
    };

    const handleOnline = () => {
      if (!user) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log('Network reconnected, refreshing profile...');
        refreshProfile();
      }, 1000); // 1 second debounce
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [user, refreshProfile]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    logout: async () => {
      try {
        console.log('🔓 Starting logout process...');
        
        // Clear state immediately for faster UI feedback
        setUser(null);
        setProfile(null);

        import('@/lib/onesignal').then((m) => m.oneSignalLogout()).catch(() => {});

        // Sign out from Supabase auth
        try {
          const { error } = await supabase.auth.signOut({ scope: 'local' });
          if (error) {
            console.warn('⚠️ Supabase signOut had issues:', error.message);
          } else {
            console.log('✅ Supabase auth cleared');
          }
        } catch (supabaseErr) {
          console.error('❌ Supabase signOut error:', supabaseErr);
        }

        // Clear all storage
        try {
          mobileAuthHelper.clearAllStorage();
          console.log('✅ Storage cleared');
        } catch (storageErr) {
          console.error('❌ Storage clear error:', storageErr);
        }

        // Redirect to signin
        console.log('🔄 Redirecting to signin...');
        if (typeof window !== 'undefined') {
          // Small delay to ensure state is cleared before redirect
          setTimeout(() => {
            window.location.href = '/signin';
          }, 100);
        }
      } catch (err) {
        console.error('🚨 Logout exception:', err);
        
        // Fallback: force clear everything and redirect
        try {
          setUser(null);
          setProfile(null);
          mobileAuthHelper.clearAllStorage();
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        } catch {}
        
        if (typeof window !== 'undefined') {
          window.location.href = '/signin';
        }
      }
    },
    refreshProfile,
    updateLocalProfile,
  }), [user, profile, loading, refreshProfile, updateLocalProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
