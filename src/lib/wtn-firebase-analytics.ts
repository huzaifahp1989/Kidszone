/**
 * WebToNative (WTN) Firebase Analytics helpers.
 * All calls no-op unless `window.WTN.Firebase` exists (native shell only).
 */

export const WTN_ANALYTICS_EVENTS = {
  kidsZoneOpened: 'kids_zone_opened',
  quizCompleted: 'quiz_completed',
  quranRecordingSubmitted: 'quran_recording_submitted',
  podcastPlayed: 'podcast_played',
  radioStarted: 'radio_started',
  competitionJoined: 'competition_joined',
  referralShared: 'referral_shared',
  dailyReminderOpened: 'daily_reminder_opened',
} as const;

export type WtnAnalyticsEventName =
  (typeof WTN_ANALYTICS_EVENTS)[keyof typeof WTN_ANALYTICS_EVENTS];

type WtnFirebaseAnalytics = {
  setCollection?: (opts: { enabled: boolean }) => void;
  setUserId?: (opts: { userId: string }) => void;
  logEvent?: (opts: {
    name: string;
    params?: Record<string, string | number | boolean>;
  }) => void;
};

type WtnFirebase = {
  Analytics?: WtnFirebaseAnalytics;
};

type WtnWindow = Window & {
  WTN?: {
    Firebase?: WtnFirebase;
  };
};

/** True only inside a WebToNative shell that exposes Firebase. */
export function isWtnFirebaseAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean((window as WtnWindow).WTN?.Firebase);
  } catch {
    return false;
  }
}

export function getWtnFirebaseAnalytics(): WtnFirebaseAnalytics | null {
  if (!isWtnFirebaseAvailable()) return null;
  try {
    return (window as WtnWindow).WTN?.Firebase?.Analytics ?? null;
  } catch {
    return null;
  }
}

export function enableWtnAnalyticsCollection(): void {
  try {
    if (!isWtnFirebaseAvailable()) return;
    getWtnFirebaseAnalytics()?.setCollection?.({ enabled: true });
  } catch (err) {
    console.warn('[WTN Firebase Analytics] setCollection failed:', err);
  }
}

export function setWtnAnalyticsUserId(userId: string): void {
  if (!userId) return;
  try {
    if (!isWtnFirebaseAvailable()) return;
    getWtnFirebaseAnalytics()?.setUserId?.({ userId });
  } catch (err) {
    console.warn('[WTN Firebase Analytics] setUserId failed:', err);
  }
}

/** Fire a WTN Firebase Analytics event when available (no-op in browsers). */
export function logWtnFirebaseEvent(
  name: WtnAnalyticsEventName | string,
  params?: Record<string, string | number | boolean>
): void {
  try {
    if (!isWtnFirebaseAvailable()) return;
    const analytics = getWtnFirebaseAnalytics();
    if (!analytics?.logEvent) return;
    analytics.logEvent(params ? { name, params } : { name });
  } catch (err) {
    console.warn('[WTN Firebase Analytics] logEvent failed:', err);
  }
}

export function trackKidsZoneOpened() {
  logWtnFirebaseEvent(WTN_ANALYTICS_EVENTS.kidsZoneOpened);
}

export function trackQuizCompleted(params?: Record<string, string | number | boolean>) {
  logWtnFirebaseEvent(WTN_ANALYTICS_EVENTS.quizCompleted, params);
}

export function trackQuranRecordingSubmitted(
  params?: Record<string, string | number | boolean>
) {
  logWtnFirebaseEvent(WTN_ANALYTICS_EVENTS.quranRecordingSubmitted, params);
}

export function trackPodcastPlayed(params?: Record<string, string | number | boolean>) {
  logWtnFirebaseEvent(WTN_ANALYTICS_EVENTS.podcastPlayed, params);
}

export function trackRadioStarted(params?: Record<string, string | number | boolean>) {
  logWtnFirebaseEvent(WTN_ANALYTICS_EVENTS.radioStarted, params);
}

export function trackCompetitionJoined(params?: Record<string, string | number | boolean>) {
  logWtnFirebaseEvent(WTN_ANALYTICS_EVENTS.competitionJoined, params);
}

export function trackReferralShared(params?: Record<string, string | number | boolean>) {
  logWtnFirebaseEvent(WTN_ANALYTICS_EVENTS.referralShared, params);
}

export function trackDailyReminderOpened(
  params?: Record<string, string | number | boolean>
) {
  logWtnFirebaseEvent(WTN_ANALYTICS_EVENTS.dailyReminderOpened, params);
}
