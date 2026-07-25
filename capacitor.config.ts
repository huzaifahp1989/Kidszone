import type { CapacitorConfig } from '@capacitor/cli';

/** Keep in sync with src/lib/app-url.ts — must be a deploy with real Supabase env. */
const LIVE_APP_URL = 'https://islamic-kids-platform.vercel.app';

const serverUrl = process.env.CAPACITOR_SERVER_URL || LIVE_APP_URL;

const config: CapacitorConfig = {
  appId: 'com.wnapp.id1761553570260',
  appName: 'Kids Zone',
  webDir: 'www',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
        },
      }
    : {}),
};

export default config;
