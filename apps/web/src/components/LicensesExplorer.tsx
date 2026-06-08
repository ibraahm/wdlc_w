'use client';

import { Fragment, useMemo, useState } from 'react';

export type LicenseRow = {
  state: string;
  number: string;
  status?: string;
  since?: string;
  licenseType?: string;
  regulator?: string;
  disclosure?: string;
};

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'Active';
  const cls =
    s === 'Active'
      ? 'bg-green-100 text-green-800'
      : s === 'Pending'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-gray-200 text-gray-700';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {s}
    </span>
  );
}

export default function LicensesExplorer({
  rows,
  generalDisclosure,
}: {
  rows: LicenseRow[];
  generalDisclosure: string;
}) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.state.toLowerCase().includes(q) || r.number.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div>
      {/* General disclosure */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-4 text-sm text-gray-700 leading-relaxed">
        {generalDisclosure}
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search state or license #…"
            className="w-full rounded-lg border border-[#d9e0e8] bg-white px-3 py-2 pl-9 text-sm text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">
          {filtered.length} of {rows.length} jurisdictions
        </p>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left font-semibold text-gray-900">State</th>
              <th className="px-5 py-3 text-left font-semibold text-gray-900">License / Registration #</th>
              <th className="px-5 py-3 text-left font-semibold text-gray-900">Licensed Since</th>
              <th className="px-5 py-3 text-left font-semibold text-gray-900">Status</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-900">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  No jurisdictions match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const open = expanded === r.state;
                return (
                  <Fragment key={r.state}>
                    <tr
                      className="cursor-pointer odd:bg-white even:bg-gray-50 hover:bg-blue-50/50 transition-colors"
                      onClick={() => setExpanded(open ? null : r.state)}
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">{r.state}</td>
                      <td className="px-5 py-3 text-gray-700">{r.number}</td>
                      <td className="px-5 py-3 text-gray-600">{r.since ?? 'On file (NMLS)'}</td>
                      <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-primary text-xs font-medium">
                          {open ? 'Hide' : 'View'}
                          <svg className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-blue-50/30">
                        <td colSpan={5} className="px-5 py-4">
                          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">License type</dt>
                              <dd className="text-sm text-gray-700">{r.licenseType ?? 'Money Transmitter License'}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">First licensed</dt>
                              <dd className="text-sm text-gray-700">{r.since ?? 'See NMLS Consumer Access record'}</dd>
                            </div>
                            {r.regulator && (
                              <div className="md:col-span-2">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">State regulator</dt>
                                <dd className="text-sm text-gray-700">{r.regulator}</dd>
                              </div>
                            )}
                            {r.disclosure && (
                              <div className="md:col-span-2">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Required consumer disclosure</dt>
                                <dd className="text-sm text-gray-700 leading-relaxed">{r.disclosure}</dd>
                              </div>
                            )}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
