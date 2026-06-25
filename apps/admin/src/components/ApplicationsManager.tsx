'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AgentApplication, ApplicationAddress } from '@/lib/api';
import {
  setApplicationStatusAction,
  deleteApplicationAction,
  archiveApplicationAction,
  unarchiveApplicationAction,
  forceDeleteApplicationAction,
  updateApplicationAddressAction,
  sendApplicationDocuSignAction,
} from '@/lib/actions';
import { EmptyState } from './ui-admin';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

const STATUSES = ['NEW', 'REVIEWING', 'APPROVED', 'REJECTED'] as const;

function statusClasses(status: string): string {
  switch (status) {
    case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
    case 'REVIEWING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-blue-100 text-blue-800 border-blue-200';
  }
}

function fullName(a: AgentApplication) {
  return `${a.firstName} ${a.lastName}`.trim();
}

function businessName(a: AgentApplication) {
  return a.company?.trim() || fullName(a);
}

function addressLine(a: AgentApplication) {
  return [
    a.businessStreet,
    [a.businessCity, a.businessState, a.businessZip].filter(Boolean).join(', '),
    a.businessCountry,
  ].filter(Boolean).join(' - ');
}

function choice(value?: string | null, other?: string | null) {
  return value === 'Other' ? other : value;
}

function yesNo(value: boolean, detail?: string | null) {
  if (!value) return 'No';
  return detail ? `Yes - ${detail}` : 'Yes';
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : null;
}

function signatureLine(a: AgentApplication) {
  if (!a.signatureName) return null;
  return [a.signatureName, a.signatureTitle].filter(Boolean).join(' - ');
}

function completeness(a: AgentApplication) {
  const required = [
    a.firstName,
    a.lastName,
    a.businessStreet,
    a.businessCountry,
    a.businessCity,
    a.businessZip,
    a.businessPhone,
    a.email,
    a.productsOffered,
    a.signatureName,
    a.signatureConsent ? 'accepted' : '',
  ];
  const complete = required.filter((item) => !!String(item ?? '').trim()).length;
  return Math.round((complete / required.length) * 100);
}

function reviewFlags(a: AgentApplication) {
  const flags: string[] = [];
  if (a.status === 'NEW') flags.push('Needs triage');
  if (a.declinedBefore) flags.push('Prior decline');
  if (a.currentlyProvides) flags.push('Existing provider');
  if (a.providedPast) flags.push('Prior provider history');
  const locations = Number.parseInt(a.totalLocations ?? '', 10);
  if (Number.isFinite(locations) && locations > 1) flags.push(`${locations} locations`);
  if (a.applicantType !== 'INDIVIDUAL' && !a.company?.trim()) flags.push('Company missing');
  return flags;
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  const clean = typeof value === 'string' ? value.trim() : value;
  if (!clean) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{clean}</dd>
    </div>
  );
}

function CountCard({ label, value, active, onClick }: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
        active ? 'border-navy bg-navy text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-navy/40'
      }`}
    >
      <span className="block text-2xl font-bold">{value}</span>
      <span className={`text-xs ${active ? 'text-white/75' : 'text-gray-400'}`}>{label}</span>
    </button>
  );
}

function AddressEditor({
  app,
  pending,
  onSave,
  onCancel,
}: {
  app: AgentApplication;
  pending: boolean;
  onSave: (address: ApplicationAddress) => void;
  onCancel: () => void;
}) {
  const [street, setStreet] = useState(app.businessStreet);
  const [city, setCity] = useState(app.businessCity);
  const [stateField, setStateField] = useState(app.businessState ?? '');
  const [zip, setZip] = useState(app.businessZip);
  const [phone, setPhone] = useState((app.businessPhone || '').replace(/^\+1/, ''));
  const [err, setErr] = useState('');

  const fieldCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30';

  function submit() {
    setErr('');
    const digits = phone.replace(/\D/g, '').replace(/^1/, '');
    if (!street.trim() || !city.trim() || !stateField || !zip.trim()) {
      setErr('Street, city, state and ZIP are required.');
      return;
    }
    if (!/^\d{5}(?:-\d{4})?$/.test(zip.trim())) {
      setErr('Enter a valid U.S. ZIP code.');
      return;
    }
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) {
      setErr('Enter a valid 10-digit U.S. phone number.');
      return;
    }
    onSave({
      businessStreet: street.trim(),
      businessCountry: 'United States',
      businessState: stateField,
      businessCity: city.trim(),
      businessZip: zip.trim(),
      businessPhone: `+1${digits}`,
    });
  }

  return (
    <div className="rounded-lg border border-navy/20 bg-blue-50/40 p-4">
      <p className="mb-3 text-sm font-semibold text-gray-900">Correct business address</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2 block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Street address</span>
          <input value={street} onChange={(e) => setStreet(e.target.value)} className={fieldCls} placeholder="Business location, not a home address" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">City</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">State</span>
          <select value={stateField} onChange={(e) => setStateField(e.target.value)} className={fieldCls}>
            <option value="">Select…</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">ZIP</span>
          <input value={zip} onChange={(e) => setZip(e.target.value)} className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldCls} placeholder="(404) 555-0123" />
        </label>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={submit} disabled={pending} className="rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
          {pending ? 'Saving…' : 'Save address'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
      </div>
      <p className="mt-2 text-[11px] text-gray-500">Changes the address on this application{app.ddFile ? ' and its DD file' : ''}. This action is audited.</p>
    </div>
  );
}

function DocuSignPanel({ app, onClose }: { app: AgentApplication; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('World Direct Link — documents for your signature');
  const [signerName, setSignerName] = useState(`${app.firstName} ${app.lastName}`.trim());
  const [signerEmail, setSignerEmail] = useState(app.email);
  const [cc, setCc] = useState('');
  const [anchor, setAnchor] = useState('Signature:');
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState('');
  const [envelopeId, setEnvelopeId] = useState('');

  const fieldCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30';

  async function send() {
    setErr('');
    setEnvelopeId('');
    if (!file) { setErr('Choose a PDF to send.'); return; }
    if (!signerEmail.trim()) { setErr('A signer email is required.'); return; }
    const form = new FormData();
    form.append('file', file);
    form.append('emailSubject', subject);
    form.append('signerName', signerName);
    form.append('signerEmail', signerEmail.trim());
    form.append('cc', cc.trim());
    form.append('anchorString', anchor.trim());
    setPending(true);
    const res = await sendApplicationDocuSignAction(app.id, form);
    setPending(false);
    if (res.ok) setEnvelopeId(res.envelopeId ?? 'sent');
    else setErr(res.error ?? 'Send failed');
  }

  if (envelopeId) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-semibold text-green-800">Sent for e-signature ✓</p>
        <p className="mt-1 text-xs text-green-700">Envelope ID: <code>{envelopeId}</code>. {signerEmail} will receive the DocuSign request.</p>
        <button type="button" onClick={onClose} className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Close</button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-navy/20 bg-blue-50/40 p-4">
      <p className="mb-1 text-sm font-semibold text-gray-900">Send a document for e-signature (DocuSign)</p>
      <p className="mb-3 text-xs text-gray-500">Upload a prefilled PDF (e.g. the Authorized Agent Agreement or Agent Application). It is sent straight to DocuSign — nothing is stored here.</p>
      <div className="space-y-3">
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Email subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldCls} />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Signer name</span>
            <input value={signerName} onChange={(e) => setSignerName(e.target.value)} className={fieldCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Signer email</span>
            <input value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} className={fieldCls} />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">CC emails (comma-separated, optional)</span>
            <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="compliance@worlddirectlink.com" className={fieldCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Signature anchor text</span>
            <input value={anchor} onChange={(e) => setAnchor(e.target.value)} placeholder="Signature:" className={fieldCls} />
            <span className="mt-1 block text-[11px] text-gray-400">Where in the PDF to place the sign/date tabs.</span>
          </label>
        </div>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={send} disabled={pending} className="rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
          {pending ? 'Sending…' : 'Send via DocuSign'}
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );
}

export default function ApplicationsManager({
  applications,
  archivedApplications,
  canApprove,
  canManage,
  canHardDelete,
  docuSignAvailable,
  initialExpandedId,
}: {
  applications: AgentApplication[];
  archivedApplications: AgentApplication[];
  canApprove: boolean;
  canManage: boolean;
  canHardDelete: boolean;
  docuSignAvailable: boolean;
  initialExpandedId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(initialExpandedId ?? null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | typeof STATUSES[number]>('ALL');
  const [query, setQuery] = useState('');
  const [awaitingDdOnly, setAwaitingDdOnly] = useState(false);
  const [viewArchived, setViewArchived] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const next: Record<string, number> = { ALL: applications.length, NEW: 0, REVIEWING: 0, APPROVED: 0, REJECTED: 0 };
    for (const app of applications) next[app.status] = (next[app.status] ?? 0) + 1;
    return next;
  }, [applications]);

  // Approved leads that don't yet have a DD file opened - the onboarding gap.
  const awaitingDdCount = useMemo(
    () => applications.filter((a) => a.status === 'APPROVED' && !a.ddFile).length,
    [applications],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = viewArchived ? archivedApplications : applications;
    return source.filter((app) => {
      if (!viewArchived) {
        if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
        if (awaitingDdOnly && !(app.status === 'APPROVED' && !app.ddFile)) return false;
      }
      if (!q) return true;
      return [
        fullName(app),
        app.company,
        app.email,
        app.businessPhone,
        addressLine(app),
        app.productsOffered,
      ].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [applications, archivedApplications, query, statusFilter, awaitingDdOnly, viewArchived]);

  function changeStatus(id: string, status: string) {
    setError('');
    startTransition(async () => {
      const res = await setApplicationStatusAction(id, status);
      if (!res.ok) setError(res.error ?? 'Update failed');
      else router.refresh();
    });
  }

  function remove(a: AgentApplication) {
    if (a.status === 'APPROVED' || a.ddFile) {
      setError('Approved or DD-linked applications are locked. Archive it, or use permanent delete (no evidence only).');
      return;
    }
    if (!confirm(`Delete unapproved application for ${businessName(a)}? This keeps audit history but removes the lead from review.`)) return;
    setError('');
    startTransition(async () => {
      const res = await deleteApplicationAction(a.id);
      if (!res.ok) setError(res.error ?? 'Delete failed');
      else router.refresh();
    });
  }

  function archive(a: AgentApplication) {
    if (!confirm(`Archive the application for ${businessName(a)}? It will be hidden from the active queue${a.ddFile ? ' along with its DD file' : ''}, but kept on record. You can restore it later.`)) return;
    setError('');
    startTransition(async () => {
      const res = await archiveApplicationAction(a.id);
      if (!res.ok) setError(res.error ?? 'Archive failed');
      else router.refresh();
    });
  }

  function unarchive(a: AgentApplication) {
    setError('');
    startTransition(async () => {
      const res = await unarchiveApplicationAction(a.id);
      if (!res.ok) setError(res.error ?? 'Restore failed');
      else router.refresh();
    });
  }

  function forceDelete(a: AgentApplication) {
    if (!confirm(`PERMANENTLY delete the application for ${businessName(a)}${a.ddFile ? ' and its DD file' : ''}? This cannot be undone. It is blocked if any evidence has been collected.`)) return;
    setError('');
    startTransition(async () => {
      const res = await forceDeleteApplicationAction(a.id);
      if (!res.ok) setError(res.error ?? 'Delete failed');
      else router.refresh();
    });
  }

  function saveAddress(id: string, address: ApplicationAddress) {
    setError('');
    startTransition(async () => {
      const res = await updateApplicationAddressAction(id, address);
      if (!res.ok) setError(res.error ?? 'Update failed');
      else {
        setEditingAddress(null);
        router.refresh();
      }
    });
  }

  if (applications.length === 0 && archivedApplications.length === 0) {
    return (
      <EmptyState
        icon="A"
        title="No agent applications yet"
        description="Submissions from the public Become an Agent form will appear here for review. Approving an application opens its due-diligence file automatically."
        actionHref="/agent-dd"
        actionLabel="Go to Due Diligence"
      />
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-3 md:grid-cols-5">
        <CountCard label="All applications" value={counts.ALL} active={!viewArchived && statusFilter === 'ALL'} onClick={() => { setViewArchived(false); setStatusFilter('ALL'); }} />
        {STATUSES.map((status) => (
          <CountCard
            key={status}
            label={status.replace(/_/g, ' ')}
            value={counts[status] ?? 0}
            active={!viewArchived && statusFilter === status}
            onClick={() => { setViewArchived(false); setStatusFilter(status); }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="self-center text-xs font-medium text-gray-400">Saved views:</span>
        <button
          onClick={() => { setViewArchived(false); setAwaitingDdOnly(false); setStatusFilter('ALL'); }}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${!viewArchived && !awaitingDdOnly && statusFilter === 'ALL' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({counts.ALL})
        </button>
        <button
          onClick={() => { setViewArchived(false); setStatusFilter('NEW'); setAwaitingDdOnly(false); }}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${!viewArchived && statusFilter === 'NEW' && !awaitingDdOnly ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Needs triage ({counts.NEW ?? 0})
        </button>
        <button
          onClick={() => { setViewArchived(false); setAwaitingDdOnly(true); setStatusFilter('ALL'); }}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${!viewArchived && awaitingDdOnly ? 'bg-navy text-white' : awaitingDdCount > 0 ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Awaiting DD file ({awaitingDdCount})
        </button>
        <button
          onClick={() => { setViewArchived(true); setAwaitingDdOnly(false); setStatusFilter('ALL'); }}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${viewArchived ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Archived ({archivedApplications.length})
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{viewArchived ? 'Archived applications' : 'Review queue'}</h2>
          <p className="text-xs text-gray-400">
            {viewArchived
              ? 'Hidden from the active queue but kept on record. Restore to bring back, or permanently delete (no evidence only).'
              : 'Approve opens a linked DD file. Approved records are locked — archive or permanently delete instead.'}
          </p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, business, email, phone, address"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm md:max-w-sm"
        />
      </div>

      <div className="space-y-4">
        {visible.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
            {viewArchived ? 'No archived applications.' : 'No applications match the current filters.'}
          </div>
        )}

        {visible.map((a) => {
          const score = completeness(a);
          const flags = reviewFlags(a);
          const isExpanded = expanded === a.id;
          const locked = a.status === 'APPROVED' || !!a.ddFile;

          return (
            <article key={a.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold text-gray-900">{businessName(a)}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClasses(a.status)}`}>
                      {a.status}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                      {a.applicantType === 'INDIVIDUAL' ? 'Individual' : 'Business'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">Owner: {fullName(a)}</p>
                  <p className="mt-1 text-xs text-gray-400">{a.email} - {a.businessPhone}</p>
                  <p className="mt-2 text-sm text-gray-700">{addressLine(a)}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-500">Application completeness</span>
                      <span className="font-semibold text-gray-700">{score}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-navy" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(flags.length ? flags : ['No review flags']).map((flag) => (
                      <span key={flag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        {flag}
                      </span>
                    ))}
                  </div>
                  {a.ddFile ? (
                    <Link href={`/agent-dd/${a.ddFile.id}`} className="inline-flex text-xs font-semibold text-navy hover:underline">
                      Open DD file - {a.ddFile.stage.replace(/_/g, ' ')}
                      {a.ddFile.riskRating ? ` - ${a.ddFile.riskRating} risk` : ''}
                    </Link>
                  ) : (
                    <p className="text-xs text-gray-400">{a.status === 'APPROVED' ? 'DD file pending refresh' : 'Approve to open DD file'}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 lg:w-44">
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : a.id)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {isExpanded ? 'Hide packet' : 'View packet'}
                  </button>

                  {viewArchived ? (
                    <>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => unarchive(a)}
                          disabled={isPending}
                          className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          Restore
                        </button>
                      )}
                      {canHardDelete && (
                        <button
                          type="button"
                          onClick={() => forceDelete(a)}
                          disabled={isPending}
                          className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          title="Permanently delete (blocked if evidence exists)"
                        >
                          Delete permanently
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {canApprove && a.status !== 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => changeStatus(a.id, 'APPROVED')}
                          disabled={isPending}
                          className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                        >
                          Approve + open DD
                        </button>
                      )}
                      {canApprove && a.status === 'NEW' && (
                        <button
                          type="button"
                          onClick={() => changeStatus(a.id, 'REVIEWING')}
                          disabled={isPending}
                          className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          Start review
                        </button>
                      )}
                      {canApprove && a.status !== 'REJECTED' && a.status !== 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => changeStatus(a.id, 'REJECTED')}
                          disabled={isPending}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setEditingAddress(editingAddress === a.id ? null : a.id)}
                          disabled={isPending}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          title="Correct the business/service address"
                        >
                          {editingAddress === a.id ? 'Close address' : 'Edit address'}
                        </button>
                      )}
                      {canManage && docuSignAvailable && (
                        <button
                          type="button"
                          onClick={() => setSigningId(signingId === a.id ? null : a.id)}
                          disabled={isPending}
                          className="rounded-lg border border-navy/30 px-3 py-2 text-xs font-semibold text-navy hover:bg-navy/5 disabled:opacity-50"
                          title="Send a PDF to the agent for e-signature via DocuSign"
                        >
                          {signingId === a.id ? 'Close e-sign' : 'Send for e-sign'}
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => archive(a)}
                          disabled={isPending}
                          className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                          title="Hide from the active queue but keep on record"
                        >
                          Archive
                        </button>
                      )}
                      {canApprove && !locked && (
                        <button
                          type="button"
                          onClick={() => remove(a)}
                          disabled={isPending}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          title="Delete unapproved lead (keeps audit history)"
                        >
                          Delete
                        </button>
                      )}
                      {canHardDelete && locked && (
                        <button
                          type="button"
                          onClick={() => forceDelete(a)}
                          disabled={isPending}
                          className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          title="Permanently delete incl. DD file (blocked if evidence exists)"
                        >
                          Delete permanently
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {editingAddress === a.id && !viewArchived && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <AddressEditor
                    app={a}
                    pending={isPending}
                    onSave={(addr) => saveAddress(a.id, addr)}
                    onCancel={() => setEditingAddress(null)}
                  />
                </div>
              )}

              {signingId === a.id && !viewArchived && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <DocuSignPanel app={a} onClose={() => setSigningId(null)} />
                </div>
              )}

              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Full application packet</h4>
                      <p className="text-xs text-gray-400">Received {new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                    {a.ddFile && (
                      <Link href={`/agent-dd/${a.ddFile.id}`} className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:opacity-90">
                        Continue DD file
                      </Link>
                    )}
                  </div>

                  <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Detail label="Owner / principal" value={fullName(a)} />
                    <Detail label="Business name" value={a.company} />
                    <Detail label="Applicant type" value={a.applicantType === 'INDIVIDUAL' ? 'Individual' : 'Business'} />
                    <Detail label="Email" value={a.email} />
                    <Detail label="Phone" value={a.businessPhone} />
                    <Detail label="Business address" value={addressLine(a)} />
                    <Detail label="Business type" value={choice(a.businessType, a.businessTypeOther)} />
                    <Detail label="Products to offer" value={a.productsOffered} />
                    <Detail label="How they found us" value={choice(a.howFound, a.howFoundOther)} />
                    <Detail label="Currently offers money services" value={yesNo(a.currentlyProvides, a.currentProvider)} />
                    <Detail label="Previously offered money services" value={yesNo(a.providedPast, a.pastProvider)} />
                    <Detail label="Declined before" value={yesNo(a.declinedBefore, a.declinedExplain)} />
                    <Detail label="Preferred language" value={choice(a.preferredLanguage, a.preferredLanguageOther)} />
                    <Detail label="Anticipated monthly volume (USD)" value={a.anticipatedDollarVolume || a.monthlyVolume} />
                    <Detail label="Total locations" value={a.totalLocations} />
                    <Detail label="Electronic signature" value={signatureLine(a)} />
                    <Detail label="Signature accepted" value={formatDateTime(a.signatureAcceptedAt)} />
                    <Detail label="Signer IP" value={a.signatureIp} />
                    <Detail label="Signer user agent" value={a.signatureUserAgent} />
                  </dl>
                  <div className="mt-3">
                    <Detail label="Comments" value={a.comments} />
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
