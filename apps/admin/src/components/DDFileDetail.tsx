'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DDFile, DDDocument } from '@/lib/api';
import { setDDBranchCodeAction } from '@/lib/actions';
import RiskAssessmentPanel from './RiskAssessmentPanel';
import DDSignatureTracker from './DDSignatureTracker';
import LifecyclePipeline from './LifecyclePipeline';
import DocRow from './DocRow';
import { ONBOARDING_SECTIONS, ATTENTION, DATE_MIN, DATE_MAX } from './dd-checklist';
import {
  setDDRiskAction,
  recordDDReviewAction,
} from '@/lib/actions';

const STAGE_LABELS: Record<string, string> = {
  APPLICATION: 'Application',
  UNDER_REVIEW: 'Under Review',
  DD_IN_PROGRESS: 'DD In Progress',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  TERMINATED: 'Terminated',
  REJECTED: 'Rejected',
};
const STAGE_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  SUSPENDED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  TERMINATED: 'bg-red-100 text-red-700 border-red-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  APPLICATION: 'bg-blue-50 text-blue-700 border-blue-200',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800 border-blue-200',
  DD_IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
};
const RISK_COLOR: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800 border-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HIGH: 'bg-red-100 text-red-700 border-red-200',
};
const SECTIONS: { key: DDDocument['section']; title: string; description: string }[] = [
  { key: 'DOCUMENTATION', title: 'Business and principal documentation', description: 'Core records required before activation.' },
  { key: 'COMPLIANCE', title: 'Compliance documentation', description: 'Screening, training, AML acknowledgements, and volume evidence.' },
  { key: 'ONGOING', title: 'Ongoing due diligence', description: 'Recurring reviews and renewals after onboarding.' },
];

function clean(value?: string | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function ownerName(file: DDFile) {
  const app = file.application;
  return app ? `${app.firstName} ${app.lastName}`.trim() : null;
}

function addressLine(file: DDFile) {
  const app = file.application;
  if (!app) return null;
  return [
    app.businessStreet,
    [app.businessCity, app.businessState, app.businessZip].filter(Boolean).join(', '),
    app.businessCountry,
  ].filter(Boolean).join(' - ');
}

function choice(value?: string | null, other?: string | null) {
  return value === 'Other' ? other : value;
}

function yesNo(value?: boolean, detail?: string | null) {
  if (!value) return 'No';
  return detail ? `Yes - ${detail}` : 'Yes';
}

function signatureLine(file: DDFile) {
  const app = file.application;
  if (!app?.signatureName) return null;
  return [app.signatureName, app.signatureTitle].filter(Boolean).join(' - ');
}

function Detail({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  const v = clean(value);
  if (!v) return null;
  return (
    <div className={`rounded-lg border border-gray-200 bg-white px-3 py-2 ${wide ? 'md:col-span-2 xl:col-span-3' : ''}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{v}</dd>
    </div>
  );
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : null;
}

function buildActivationBlockers(file: DDFile) {
  const docs = file.documents ?? [];
  const blockers: string[] = [];
  if (!file.riskRating) blockers.push('Assign a risk rating');
  if (!file.lastReviewedAt || !file.reviewedBy) blockers.push('Record compliance review');
  const requiredDocs = docs.filter((doc) => (
    doc.status !== 'NA'
    && ONBOARDING_SECTIONS.has(doc.section)
    && doc.status !== 'OK'
  ));
  if (requiredDocs.length > 0) {
    blockers.push(`${requiredDocs.length} onboarding document${requiredDocs.length === 1 ? '' : 's'} not cleared`);
  }
  return blockers;
}

function sectionProgress(docs: DDDocument[]) {
  const applicable = docs.filter((doc) => doc.status !== 'NA');
  if (applicable.length === 0) return 100;
  const ok = applicable.filter((doc) => doc.status === 'OK').length;
  return Math.round((ok / applicable.length) * 100);
}

export default function DDFileDetail({
  initialFile,
  canManageLifecycle,
  currentUser,
  canAssessRisk = false,
}: {
  initialFile: DDFile;
  canManageLifecycle: boolean;
  currentUser?: string;
  canAssessRisk?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const f = initialFile;
  const [nextReview, setNextReview] = useState(f.nextReviewDueAt?.slice(0, 10) ?? '');
  const [attentionOnly, setAttentionOnly] = useState(false);

  const docs = f.documents ?? [];
  const blockers = useMemo(() => buildActivationBlockers(f), [f]);
  const summary = useMemo(() => {
    const counts = { OK: 0, EXPIRING: 0, EXPIRED: 0, MISSING: 0, NA: 0 } as Record<DDDocument['status'], number>;
    for (const doc of docs) counts[doc.status] += 1;
    return counts;
  }, [docs]);
  const totalApplicable = docs.filter((doc) => doc.status !== 'NA').length;
  const totalProgress = totalApplicable ? Math.round((summary.OK / totalApplicable) * 100) : 100;
  const attentionCount = docs.filter((doc) => ATTENTION.has(doc.status)).length;
  const readyForActivation = blockers.length === 0;

  const locationHref = (() => {
    if (!f.application) return '/agents';
    const params = new URLSearchParams({
      businessName: f.agentName,
      addressLine: f.application.businessStreet,
      city: f.application.businessCity,
      state: f.application.businessState ?? '',
      zip: f.application.businessZip,
      country: f.application.businessCountry || 'USA',
      phone: f.application.businessPhone,
    });
    return `/agents?${params.toString()}`;
  })();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError('');
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? 'Update failed');
      else router.refresh();
    });
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/agent-dd" className="text-sm text-gray-400 hover:text-gray-600">Back to DD files</Link>
            <Link href={`/agent-profile/${f.id}`} className="text-sm font-medium text-gold hover:underline">360 view →</Link>
            <a
              href={`/api/agent-dd/${f.id}/application`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              title="Download the agent's application form (PDF)"
            >
              ⬇ Download application
            </a>
            <a
              href={`/api/agent-dd/${f.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              title="Download the due-diligence checklist (PDF)"
            >
              ⬇ Download DD checklist
            </a>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{f.agentName}</h1>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STAGE_COLOR[f.stage] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {STAGE_LABELS[f.stage] ?? f.stage}
            </span>
            <BranchCodeChip id={f.id} branchCode={f.branchCode ?? null} canEdit={canManageLifecycle} />
            {f.riskRating && (
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${RISK_COLOR[f.riskRating]}`}>
                {f.riskRating} risk
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Owner: {ownerName(f) ?? 'Not linked'}{addressLine(f) ? ` - ${addressLine(f)}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {f.application && (
            <Link
              href={`/applications?application=${f.application.id}`}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              View source application
            </Link>
          )}
          <Link
            href={locationHref}
            className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            Add/check location
          </Link>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</p>}
      {!canManageLifecycle && (
        <p className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          Compliance approval is required to change lifecycle stage, risk rating, or review status.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Agent identity</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">{f.agentName}</h2>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {f.entityType === 'INDIVIDUAL' ? 'Individual' : 'Business'}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 md:grid-cols-2">
            <Detail label="Owner / principal" value={ownerName(f)} />
            <Detail label="Business phone" value={f.application?.businessPhone} />
            <Detail label="Email" value={f.application?.email} />
            <Detail label="Products" value={f.application?.productsOffered} />
            <Detail label="Address" value={addressLine(f)} wide />
          </dl>
        </section>

        <section className={`rounded-xl border p-4 ${readyForActivation ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Activation readiness</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className={`text-3xl font-bold ${readyForActivation ? 'text-green-800' : 'text-yellow-800'}`}>{totalProgress}%</p>
              <p className="text-sm text-gray-600">Checklist complete</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${readyForActivation ? 'bg-green-700 text-white' : 'bg-yellow-100 text-yellow-800'}`}>
              {readyForActivation ? 'Ready for ACTIVE' : 'Blocked'}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
            <div className={`h-full rounded-full ${readyForActivation ? 'bg-green-700' : 'bg-yellow-600'}`} style={{ width: `${totalProgress}%` }} />
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {(blockers.length ? blockers : ['No activation blockers detected']).map((blocker) => (
              <li key={blocker} className="rounded-lg bg-white/70 px-3 py-2 text-gray-700">
                {blocker}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {f.application && (
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Full application packet</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">Submitted form information</h2>
              <p className="text-xs text-gray-400">
                Received {formatDate(f.application.createdAt)} - status {f.application.status}
              </p>
            </div>
          </div>
          <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Detail label="Owner / principal" value={ownerName(f)} />
            <Detail label="Business name" value={f.application.company} />
            <Detail label="Applicant type" value={f.application.applicantType === 'INDIVIDUAL' ? 'Individual' : 'Business'} />
            <Detail label="Email" value={f.application.email} />
            <Detail label="Phone" value={f.application.businessPhone} />
            <Detail label="Business address" value={addressLine(f)} />
            <Detail label="Business type" value={choice(f.application.businessType, f.application.businessTypeOther)} />
            <Detail label="Products to offer" value={f.application.productsOffered} />
            <Detail label="How they found us" value={choice(f.application.howFound, f.application.howFoundOther)} />
            <Detail label="Currently offers money services" value={yesNo(f.application.currentlyProvides, f.application.currentProvider)} />
            <Detail label="Previously offered money services" value={yesNo(f.application.providedPast, f.application.pastProvider)} />
            <Detail label="Declined before" value={yesNo(f.application.declinedBefore, f.application.declinedExplain)} />
            <Detail label="Preferred language" value={choice(f.application.preferredLanguage, f.application.preferredLanguageOther)} />
            <Detail label="Anticipated monthly volume (USD)" value={f.application.anticipatedDollarVolume || f.application.monthlyVolume} />
            <Detail label="Total locations" value={f.application.totalLocations} />
            <Detail label="Electronic signature" value={signatureLine(f)} />
            <Detail label="Signature accepted" value={formatDateTime(f.application.signatureAcceptedAt)} />
            <Detail label="Signer IP" value={f.application.signatureIp} />
            <Detail label="Signer user agent" value={f.application.signatureUserAgent} wide />
            <Detail label="Comments" value={f.application.comments} wide />
          </dl>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Complete" value={summary.OK} tone="green" />
        <SummaryCard label="Missing" value={summary.MISSING} tone="gray" />
        <SummaryCard label="Expired / expiring" value={summary.EXPIRED + summary.EXPIRING} tone="red" />
      </div>

      <LifecyclePipeline
        fileId={f.id}
        stage={f.stage}
        allowedStages={f.lifecycle?.allowedStages ?? []}
        blockers={f.lifecycle?.blockers ?? blockers}
        onboardedAt={f.onboardedAt}
        canManage={canManageLifecycle}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Risk rating</p>
          <select
            defaultValue={f.riskRating ?? ''}
            disabled={isPending || !canManageLifecycle}
            onChange={(e) => e.target.value && run(() => setDDRiskAction(f.id, e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Select...</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Periodic review</p>
          <p className="mb-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Recording stamps <span className="font-semibold text-gray-800">{currentUser || 'you'}</span> as the reviewer and
            today&apos;s date <span className="font-semibold text-gray-800">({formatDate(new Date().toISOString())})</span> automatically.
          </p>
          <label className="mb-1 block text-[11px] font-medium text-gray-500">Next review due (optional)</label>
          <input
            type="date"
            value={nextReview}
            min={DATE_MIN}
            max={DATE_MAX}
            onChange={(e) => setNextReview(e.target.value)}
            disabled={isPending || !canManageLifecycle}
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            disabled={isPending || !canManageLifecycle}
            onClick={() => run(() => recordDDReviewAction(f.id, nextReview || undefined))}
            className="w-full rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-40"
          >
            Record review
          </button>
          {f.lastReviewedAt && (
            <p className="mt-2 text-xs text-gray-400">
              Last reviewed {formatDate(f.lastReviewedAt)}{f.reviewedBy ? ` by ${f.reviewedBy}` : ''}
            </p>
          )}
        </div>

        <RiskAssessmentPanel ddFileId={f.id} canAssess={canAssessRisk} />
      </div>

      <DDSignatureTracker fileId={f.id} signatures={f.signatures ?? []} canEdit={canManageLifecycle} />

      {/* Checklist toolbar: overall progress + attention filter */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Due diligence checklist</h2>
            <p className="text-xs text-gray-500">
              {summary.OK} of {totalApplicable} complete
              {attentionCount > 0 && <> · <span className="font-medium text-amber-700">{attentionCount} need attention</span></>}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <input type="checkbox" checked={attentionOnly} onChange={(e) => setAttentionOnly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            Show only items needing attention{attentionCount > 0 ? ` (${attentionCount})` : ''}
          </label>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full transition-all ${attentionCount > 0 ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${totalProgress}%` }} />
        </div>
      </div>

      {SECTIONS.map((section) => {
        const sectionDocs = docs.filter((doc) => doc.section === section.key);
        if (sectionDocs.length === 0) return null;
        const applicable = sectionDocs.filter((doc) => doc.status !== 'NA');
        const okCount = applicable.filter((doc) => doc.status === 'OK').length;
        const progress = sectionProgress(sectionDocs);
        const attention = sectionDocs.filter((doc) => ATTENTION.has(doc.status));
        const visible = attentionOnly ? attention : sectionDocs;
        return (
          <section key={section.key} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{section.title}</h2>
                  <p className="text-xs text-gray-400">{section.description}</p>
                </div>
                <div className="min-w-44">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-500">{okCount} / {applicable.length} complete</span>
                    {attention.length > 0
                      ? <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">{attention.length} attention</span>
                      : <span className="rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">All clear</span>}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full transition-all ${attention.length > 0 ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {visible.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-gray-400">
                  {attentionOnly ? 'Nothing needs attention in this section.' : 'No documents.'}
                </p>
              ) : (
                visible.map((doc) => (
                  <DocRow key={doc.code} fileId={f.id} doc={doc} disabled={isPending} onChange={run} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'green' | 'gray' | 'red' }) {
  const classes = {
    green: 'border-green-200 bg-green-50 text-green-800',
    gray: 'border-gray-200 bg-white text-gray-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 text-center ${classes}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}

function BranchCodeChip({ id, branchCode, canEdit }: { id: string; branchCode: string | null; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(branchCode ?? '');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => setEditing(true)}
        title={canEdit ? 'Set branch code' : 'Compliance approval required'}
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${branchCode ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
      >
        {branchCode ? `Branch ${branchCode}` : '+ Assign branch code'}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.toLowerCase())}
        maxLength={6}
        placeholder="uswdlc"
        className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-xs font-mono"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErr('');
          if (!/^[a-z0-9]{6}$/.test(value)) { setErr('6 lowercase letters/digits'); return; }
          start(async () => {
            const res = await setDDBranchCodeAction(id, value);
            if (res.ok) { setEditing(false); router.refresh(); } else setErr(res.error ?? 'Failed');
          });
        }}
        className="rounded-lg bg-navy px-2 py-1 text-xs font-semibold text-white"
      >
        {pending ? '…' : 'Save'}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400">Cancel</button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  );
}
