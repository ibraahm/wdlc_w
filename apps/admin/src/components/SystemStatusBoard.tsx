'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SystemStatus, SystemStatusItem } from '@/lib/api';

const DOT: Record<SystemStatusItem['state'], string> = {
  ok: 'bg-green-500',
  warn: 'bg-amber-500',
  off: 'bg-gray-300',
  info: 'bg-blue-400',
};
const VALUE_CLS: Record<SystemStatusItem['state'], string> = {
  ok: 'text-green-700',
  warn: 'text-amber-700',
  off: 'text-gray-500',
  info: 'text-gray-700',
};

export default function SystemStatusBoard({ status }: { status: SystemStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">System &amp; integrations</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Live configuration health for the backend and all portals. Secret values are never shown —
            only whether each is configured. Edit secrets in the server <code>.env</code> (never here).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
            {status.environment}
          </span>
          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isPending ? 'Checking…' : 'Re-check'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {status.groups.map((group) => (
          <div key={group.title} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">{group.title}</p>
            <ul className="space-y-2">
              {group.items.map((it) => (
                <li key={it.label} className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[it.state]}`} />
                    {it.label}
                  </span>
                  <span className="text-right">
                    <span className={`text-sm font-medium ${VALUE_CLS[it.state]} break-all`}>{it.value}</span>
                    {it.hint && <span className="block text-[11px] text-gray-400">{it.hint}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-gray-400">
        Note: backend env vars take effect after a service restart; the public apps&rsquo;
        <code> NEXT_PUBLIC_*</code> values are compiled at build time, so changing them needs a rebuild.
        Runtime toggles you can change here live below (announcement, maintenance, etc.).
      </p>
    </div>
  );
}
