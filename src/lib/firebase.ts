import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

/** islam-media-stats Firebase web config (public client keys). Env vars can override. */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDIpe4_imqnRmn4hB5DadmzRGGl_AndpXc',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'islam-media-stats.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'islam-media-stats',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'islam-media-stats.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '748617367224',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:748617367224:web:18469c9aa80e975860be4d',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-8LHGLLY2NC',
};

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let analyticsInit: Promise<Analytics | null> | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (app) return app;
  app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  return app;
}

/** Lazily init Firebase Analytics in the browser. */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (analytics) return analytics;
  if (analyticsInit) return analyticsInit;

  analyticsInit = (async () => {
    try {
      const supported = await isSupported();
      if (!supported) return null;
      const firebaseApp = getFirebaseApp();
      if (!firebaseApp) return null;
      analytics = getAnalytics(firebaseApp);
      return analytics;
    } catch (err) {
      console.warn('[Firebase Analytics] init failed:', err);
      return null;
    }
  })();

  return analyticsInit;
}

export default getFirebaseApp;
