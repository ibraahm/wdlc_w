'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FormSubmission } from '@/lib/api';
import { deleteSubmissionAction } from '@/lib/actions';
import { EmptyState } from './ui-admin';

export default function SubmissionsViewer({
  formId,
  initialSubmissions,
}: {
  formId: string;
  initialSubmissions: FormSubmission[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function remove(submissionId: string) {
    if (!confirm('Delete this submission?')) return;
    setError('');
    startTransition(async () => {
      const res = await deleteSubmissionAction(formId, submissionId);
      if (!res.ok) setError(res.error ?? 'Delete failed');
      else router.refresh();
    });
  }

  if (initialSubmissions.length === 0) {
    return (
      <EmptyState
        icon="▤"
        title="No submissions yet"
        description="When visitors submit this form on the website, their responses will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {initialSubmissions.map((s) => (
        <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleString()}</span>
            <button
              onClick={() => remove(s.id)}
              disabled={isPending}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {Object.entries(s.data)
              .filter(([k]) => !k.startsWith('_'))
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{k.replace(/_/g, ' ')}</dt>
                  <dd className="text-sm text-gray-900 break-words mt-0.5">
                    {Array.isArray(v) ? v.join(', ') : v === null || v === undefined ? '—' : String(v)}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
