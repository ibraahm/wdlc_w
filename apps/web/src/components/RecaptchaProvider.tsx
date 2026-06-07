'use client';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import type { ReactNode } from 'react';

export default function RecaptchaProvider({ children }: { children: ReactNode }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // If no key is configured (e.g. local dev without .env.local), render without
  // the provider so forms still work — reCAPTCHA will be silently skipped.
  if (!siteKey) return <>{children}</>;

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={siteKey}
      scriptProps={{ async: true, defer: true }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
