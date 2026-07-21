import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { PresenceProvider } from '@/lib/presence-context';
import { AgeModeProvider } from '@/lib/age-mode';
import { AppShell } from '@/components/AppShell';
import { FirebaseAnalyticsInit } from '@/components/FirebaseAnalyticsInit';
import { GoogleAnalyticsInit } from '@/components/GoogleAnalyticsInit';
import { Nunito, Amiri } from 'next/font/google';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-nunito',
});

const amiri = Amiri({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-amiri',
});

export const metadata: Metadata = {
  title: 'Kids Zone - Islamic Learning Platform',
  description: 'A warm, engaging Islamic learning platform for children aged 5-14',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Required so CSS env(safe-area-inset-*) resolves on notched iOS and
  // edge-to-edge Android, keeping the bottom tab bar clear of system bars.
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${nunito.variable} ${amiri.variable} font-sans antialiased`}>
        <Script
          src="https://unpkg.com/webtonative@1.1.6/webtonative.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
        />
        <AuthProvider>
          <PresenceProvider>
            <AgeModeProvider>
              <Suspense fallback={null}>
                <FirebaseAnalyticsInit />
                <GoogleAnalyticsInit />
              </Suspense>
              <AppShell>{children}</AppShell>
            </AgeModeProvider>
          </PresenceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
