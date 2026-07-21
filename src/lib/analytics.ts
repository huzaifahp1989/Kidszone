/**
 * Unified Kids Zone analytics:
 * - Firebase web Analytics (islam-media-stats) for browser + webviews
 * - WebToNative Firebase bridge when window.WTN.Firebase exists
 */

import { logEvent, setUserId as setFirebaseUserId } from 'firebase/analytics';
import { getFirebaseAnalytics } from '@/lib/firebase';
import {
  enableWtnAnalyticsCollection,
  isWtnFirebaseAvailable,
  logWtnFirebaseEvent,
  setWtnAnalyticsUserId,
} from '@/lib/wtn-firebase-analytics';

export const ANALYTICS_EVENTS = {
  kidsZoneOpened: 'kids_zone_opened',
  quizCompleted: 'quiz_completed',
  quranRecordingSubmitted: 'quran_recording_submitted',
  podcastPlayed: 'podcast_played',
  radioStarted: 'radio_started',
  competitionJoined: 'competition_joined',
  referralShared: 'referral_shared',
  dailyReminderOpened: 'daily_reminder_opened',
  pageView: 'page_view',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS] | string;

export type AnalyticsParams = Record<string, string | number | boolean>;

function sanitizeParams(params?: AnalyticsParams): AnalyticsParams | undefined {
  if (!params) return undefined;
  const out: AnalyticsParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Enable collection (WTN) and warm up Firebase web Analytics. */
export async function initAnalyticsCollection(): Promise<void> {
  if (typeof window === 'undefined') return;
  enableWtnAnalyticsCollection();
  await getFirebaseAnalytics();
}

export async function setAnalyticsUserId(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  setWtnAnalyticsUserId(userId);
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) setFirebaseUserId(analytics, userId);
  } catch (err) {
    console.warn('[Analytics] setUserId failed:', err);
  }
}

/** Log a custom event to Firebase web + WTN (when available). */
export async function trackEvent(
  name: AnalyticsEventName,
  params?: AnalyticsParams
): Promise<void> {
  if (typeof window === 'undefined') return;
  const clean = sanitizeParams(params);

  if (isWtnFirebaseAvailable()) {
    logWtnFirebaseEvent(name, clean);
  }

  try {
    const analytics = await getFirebaseAnalytics();
    if (!analytics) return;
    logEvent(analytics, name as string, clean);
  } catch (err) {
    console.warn('[Analytics] logEvent failed:', err);
  }
}

export async function trackPageView(path: string, title?: string): Promise<void> {
  await trackEvent(ANALYTICS_EVENTS.pageView, {
    page_path: path,
    page_title: title || (typeof document !== 'undefined' ? document.title : path),
  });
}

export function trackKidsZoneOpened(params?: AnalyticsParams) {
  void trackEvent(ANALYTICS_EVENTS.kidsZoneOpened, params);
}

export function trackQuizCompleted(params?: AnalyticsParams) {
  void trackEvent(ANALYTICS_EVENTS.quizCompleted, params);
}

export function trackQuranRecordingSubmitted(params?: AnalyticsParams) {
  void trackEvent(ANALYTICS_EVENTS.quranRecordingSubmitted, params);
}

export function trackPodcastPlayed(params?: AnalyticsParams) {
  void trackEvent(ANALYTICS_EVENTS.podcastPlayed, params);
}

export function trackRadioStarted(params?: AnalyticsParams) {
  void trackEvent(ANALYTICS_EVENTS.radioStarted, params);
}

export function trackCompetitionJoined(params?: AnalyticsParams) {
  void trackEvent(ANALYTICS_EVENTS.competitionJoined, params);
}

export function trackReferralShared(params?: AnalyticsParams) {
  void trackEvent(ANALYTICS_EVENTS.referralShared, params);
}

export function trackDailyReminderOpened(params?: AnalyticsParams) {
  void trackEvent(ANALYTICS_EVENTS.dailyReminderOpened, params);
}
