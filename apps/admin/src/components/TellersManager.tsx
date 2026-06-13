'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { TellerApplication } from '@/lib/api';
import { updateTellerApplicationAction } from '@/lib/actions';

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function Row({ t }: { t: TellerApplication }) {
  const router = useRouter();
  const [code, setCode] = useState(t.branchCode);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  function update(data: { branchCode?: string; status?: string }) {
    setError('');
    start(async () => {
      const res = await updateTellerApplicationAction(t.id, data);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Update failed');
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{t.firstName} {t.lastName}</p>
          <p className="text-xs text-gray-500">{t.email} · {t.phone} · applied {new Date(t.createdAt).toLocaleDateString()}</p>
          {(t.city || t.state) && <p className="text-xs text-gray-400">{[t.addressLine, t.city, t.state, t.zip].filter(Boolean).join(', ')}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {t.status.replace('_', ' ')}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-gray-500">Branch code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toLowerCase())}
          maxLength={6}
          className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-xs font-mono"
        />
        {code !== t.branchCode && (
          <button
            disabled={pending}
            onClick={() => /^[a-z0-9]{6}$/.test(code) ? update({ branchCode: code }) : setError('Code must be 6 lowercase letters/digits')}
            className="rounded-lg bg-navy px-3 py-1 text-xs font-semibold text-white"
          >
            Save code
          </button>
        )}
        <span className="flex-1" />
        {t.status !== 'APPROVED' && (
          <>
            {t.status === 'NEW' && (
              <button disabled={pending} onClick={() => update({ status: 'UNDER_REVIEW' })}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                Start review
              </button>
            )}
            <button disabled={pending} onClick={() => update({ status: 'APPROVED' })}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
              {pending ? '…' : 'Approve & send credentials'}
            </button>
            <button disabled={pending} onClick={() => update({ status: 'REJECTED' })}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
              Reject
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function TellersManager({ items }: { items: TellerApplication[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 italic">No teller applications yet.</p>;
  }
  return <div className="space-y-3">{items.map((t) => <Row key={t.id} t={t} />)}</div>;
}
