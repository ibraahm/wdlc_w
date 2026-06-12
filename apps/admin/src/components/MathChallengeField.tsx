'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Challenge = {
  question: string;
  token: string;
  expiresAt: string;
};

/**
 * Server-signed human-verification (math) challenge for auth forms.
 *
 * Drop inside a <form> that posts to a server action. It contributes two
 * fields: a hidden `humanVerificationToken` and the visible
 * `humanVerificationAnswer` input. Challenges are single-use, so a fresh
 * question is fetched automatically after every submit attempt.
 */
export default function MathChallengeField({ context }: { context: string }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/human-verification/challenge?context=${encodeURIComponent(context)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Verification could not be loaded. Try refresh.');
      setChallenge((await res.json()) as Challenge);
      const input = wrapRef.current?.querySelector<HTMLInputElement>('input[name="humanVerificationAnswer"]');
      if (input) input.value = '';
    } catch (err) {
      setChallenge(null);
      setError(err instanceof Error ? err.message : 'Verification could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Challenges are single-use: after the form submits (the action reads the
  // values synchronously), fetch a new question for any retry.
  useEffect(() => {
    const form = wrapRef.current?.closest('form');
    if (!form) return;
    const onSubmit = () => {
      window.setTimeout(() => void refresh(), 1500);
    };
    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, [refresh]);

  return (
    <div className="auth-field" ref={wrapRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label htmlFor="humanVerificationAnswer" className="auth-label">
          {loading ? 'Loading verification…' : challenge?.question ?? 'Verification unavailable'}
        </label>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="auth-link"
          style={{ fontSize: '0.72rem', background: 'none', border: 0, cursor: 'pointer' }}
        >
          New question
        </button>
      </div>
      <input
        id="humanVerificationAnswer"
        name="humanVerificationAnswer"
        inputMode="numeric"
        autoComplete="off"
        required
        disabled={!challenge || loading}
        className="auth-input"
        placeholder="Your answer"
      />
      <input type="hidden" name="humanVerificationToken" value={challenge?.token ?? ''} />
      {error ? <p style={{ color: '#a73535', fontSize: '0.8rem', marginTop: '6px' }}>{error}</p> : null}
    </div>
  );
}
