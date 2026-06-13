'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AgentBranch, BranchUser } from '@/lib/api';
import { resendBranchUserSetupAction } from '@/lib/actions';

const STAGE_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
};

function fmtDate(v?: string | null) {
  return v ? new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

function UserChip({ u }: { u: BranchUser }) {
  const router = useRouter();
  const isPrincipal = u.role === 'PRINCIPAL';
  const notSetUp = !u.lastLoginAt; // never signed in → hasn't completed account setup
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');

  function resend() {
    setMsg('');
    start(async () => {
      const res = await resendBranchUserSetupAction(u.id);
      setMsg(res.ok ? 'Setup email sent ✓' : res.error ?? 'Failed');
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className={`rounded-lg border px-3 py-2 ${u.active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {u.firstName} {u.lastName}
            <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isPrincipal ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
              {isPrincipal ? 'Principal' : 'Teller'}
            </span>
          </p>
          <p className="truncate text-xs text-gray-500">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${notSetUp ? 'bg-amber-100 text-amber-700' : u.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
            {notSetUp ? 'Pending setup' : u.active ? u.status : 'Inactive'}
          </span>
          <p className="mt-0.5 text-[10px] text-gray-400">{u.lastLoginAt ? `Last in ${fmtDate(u.lastLoginAt)}` : 'Never signed in'}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={resend}
          disabled={pending}
          className="rounded-md border border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {pending ? 'Sending…' : notSetUp ? 'Resend setup email' : 'Resend access email'}
        </button>
        {msg && <span className={`text-[11px] ${msg.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</span>}
      </div>
    </div>
  );
}

function BranchCard({ b }: { b: AgentBranch }) {
  const principals = b.users.filter((u) => u.role === 'PRINCIPAL');
  const tellers = b.users.filter((u) => u.role !== 'PRINCIPAL');
  return (
    <div className={`rounded-xl border bg-white p-5 ${b.reviewDue ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2 py-1 font-mono text-sm font-bold text-indigo-700 ring-1 ring-indigo-200">{b.branchCode}</span>
            <h2 className="text-lg font-semibold text-gray-900">{b.agentName}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_COLOR[b.stage] ?? 'bg-gray-100 text-gray-600'}`}>{b.stage}</span>
            {b.riskRating && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">{b.riskRating} risk</span>}
            {!b.compliant && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Docs incomplete</span>}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {b.application ? `${b.application.firstName} ${b.application.lastName}` : ''}
            {b.application?.businessCity ? ` · ${b.application.businessCity}, ${b.application.businessState ?? ''}` : ''}
          </p>
        </div>
        <div className="text-right text-xs">
          <p className={b.reviewDue ? 'font-semibold text-amber-700' : 'text-gray-500'}>
            {b.reviewDue ? '⚠ Review due' : 'Next review'}: {fmtDate(b.nextReviewDueAt)}
          </p>
          <p className="text-gray-400">Last reviewed {fmtDate(b.lastReviewedAt)}</p>
          <Link href={`/agent-dd/${b.id}`} className="mt-1 inline-block font-semibold text-navy hover:underline">Open DD file →</Link>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Portal users — {principals.length} principal{principals.length === 1 ? '' : 's'}, {tellers.length} teller{tellers.length === 1 ? '' : 's'}
        </p>
        {b.users.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-400">
            No portal accounts yet. The principal account is created when the DD file is activated.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {[...principals, ...tellers].map((u) => <UserChip key={u.id} u={u} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BranchesView({ branches }: { branches: AgentBranch[] }) {
  const [q, setQ] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return branches.filter((b) => {
      if (reviewOnly && !b.reviewDue) return false;
      if (!query) return true;
      return (
        b.branchCode.toLowerCase().includes(query) ||
        b.agentName.toLowerCase().includes(query) ||
        b.users.some((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(query))
      );
    });
  }, [branches, q, reviewOnly]);

  const reviewCount = branches.filter((b) => b.reviewDue).length;

  if (branches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-400">
        No active agents yet. Branches appear here once a due-diligence file is assigned a branch code and set to ACTIVE.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search branch code, agent, or user…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
        />
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {reviewCount > 0 && (
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} className="h-4 w-4 accent-amber-500" />
              Review due ({reviewCount})
            </label>
          )}
          <span className="text-gray-500">{filtered.length} of {branches.length} branches</span>
        </div>
      </div>
      <div className="space-y-4">
        {filtered.map((b) => <BranchCard key={b.id} b={b} />)}
      </div>
    </div>
  );
}
