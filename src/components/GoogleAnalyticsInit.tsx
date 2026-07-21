'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getGoogleAnalyticsMeasurementId, isGoogleAnalyticsEnabled } from '@/lib/google-analytics';

export function GoogleAnalyticsInit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const measurementId = getGoogleAnalyticsMeasurementId();

  useEffect(() => {
    if (typeof window === 'undefined' || !measurementId) return;

    const qs = searchParams?.toString();
    const currentPath = qs ? `${pathname}?${qs}` : pathname;
    const gtag = (window as Window & typeof globalThis & { gtag?: (...args: unknown[]) => void }).gtag;

    if (typeof gtag === 'function') {
      gtag('config', measurementId, {
        page_path: currentPath,
      });
    }
  }, [measurementId, pathname, searchParams]);

  if (!isGoogleAnalyticsEnabled() || !measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', { page_path: window.location.pathname + window.location.search });
        `}
      </Script>
    </>
  );
}
