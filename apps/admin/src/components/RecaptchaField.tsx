'use client';

import { useEffect, useRef } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (!SITE_KEY) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve) => {
    if (window.grecaptcha) return resolve();
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Drop inside any <form> to add invisible reCAPTCHA v3 protection. On submit it
 * fetches a fresh token, writes it to a hidden `recaptchaToken` field, then lets
 * the form's action proceed. No-op when no site key is configured.
 */
export default function RecaptchaField({ action }: { action: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const passthroughRef = useRef(false);

  useEffect(() => {
    if (!SITE_KEY) return;
    loadScript();
    const form = inputRef.current?.closest('form');
    if (!form) return;

    async function onSubmit(e: Event) {
      if (passthroughRef.current) {
        passthroughRef.current = false;
        return; // second pass — let the real submit/action run
      }
      e.preventDefault();
      e.stopPropagation();
      try {
        await loadScript();
        const token = await new Promise<string>((resolve, reject) => {
          window.grecaptcha!.ready(() => {
            window.grecaptcha!.execute(SITE_KEY!, { action }).then(resolve).catch(reject);
          });
        });
        if (inputRef.current) inputRef.current.value = token;
      } catch {
        /* lookup failed — submit anyway; backend fails open on its side */
      }
      passthroughRef.current = true;
      (form as HTMLFormElement).requestSubmit();
    }

    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, [action]);

  return <input ref={inputRef} type="hidden" name="recaptchaToken" />;
}
