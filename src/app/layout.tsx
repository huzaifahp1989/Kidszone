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
import { Outfit, Fraunces, Amiri } from 'next/font/google';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-outfit',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-fraunces',
});

const amiri = Amiri({
  subsets: ['latin', 'arabic'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-amiri',
});

export const metadata: Metadata = {
  title: 'Kids Zone - Islamic Learning Platform',
  description: 'A warm sunlit courtyard for Islamic learning — for children aged 5-14',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${outfit.variable} ${fraunces.variable} ${amiri.variable} font-sans antialiased`}>
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
