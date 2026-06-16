'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Fires a privacy-respecting, cookieless page-view beacon to our own
// same-origin /api/collect route on each navigation. No third-party trackers,
// no cookies, no fingerprinting - the server derives only an approximate
// country (from the CDN) and a salted IP hash for unique-visitor counts.
export default function VisitBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const body = JSON.stringify({ path: pathname, referrer: document.referrer || undefined });
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/collect', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* analytics must never break the page */
    }
  }, [pathname]);

  return null;
}
