'use client';

import { useCallback, useEffect, useId, useState } from 'react';

type Challenge = {
  question: string;
  token: string;
  expiresAt: string;
};

export function useHumanVerification(context: string, enabled: boolean) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/human-verification/challenge?context=${encodeURIComponent(context)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Verification could not be loaded.');
      const next = (await res.json()) as Challenge;
      setChallenge(next);
      setAnswer('');
      return next;
    } catch (err) {
      setChallenge(null);
      setError(err instanceof Error ? err.message : 'Verification could not be loaded.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  return {
    answer,
    challenge,
    error,
    loading,
    refresh,
    setAnswer,
  };
}

export function HumanVerificationField({
  answer,
  challenge,
  error,
  loading,
  onAnswerChange,
  onRefresh,
}: {
  answer: string;
  challenge: Challenge | null;
  error?: string;
  loading: boolean;
  onAnswerChange: (value: string) => void;
  onRefresh: () => void;
}) {
  const inputId = useId();

  return (
    <div className="rounded-lg border border-[#d9e0e8] bg-[#f8fafc] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor={inputId} className="block text-sm font-bold text-primary-strong mb-1">
            Human verification *
          </label>
          <p className="mb-2 text-sm text-ink/70">
            {loading ? 'Loading verification...' : challenge?.question ?? 'Verification unavailable.'}
          </p>
          <input
            id={inputId}
            inputMode="numeric"
            autoComplete="off"
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            className="w-full rounded-lg border border-[#d9e0e8] bg-white px-3 py-2 text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            disabled={!challenge || loading}
          />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center rounded-lg border border-[#d9e0e8] bg-white px-4 py-2 text-sm font-semibold text-primary-strong hover:bg-gray-50 disabled:opacity-60"
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-[#a73535] font-medium">{error}</p> : null}
    </div>
  );
}
