'use client';

import { useState } from 'react';

const inputCls = 'rounded-md border border-gray-300 px-3 py-2 text-sm';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

export default function EvidenceExport({ courses }: { courses: { id: string; title: string }[] }) {
  const [courseId, setCourseId] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [state, setState] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [passedOnly, setPassedOnly] = useState(true);

  function href(format: 'pdf' | 'csv') {
    const p = new URLSearchParams({ format });
    if (courseId) p.set('courseId', courseId);
    if (branchCode.trim()) p.set('branchCode', branchCode.trim().toUpperCase());
    if (state.trim()) p.set('state', state.trim().toUpperCase());
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (passedOnly) p.set('passedOnly', 'true');
    return `/api/training/evidence?${p.toString()}`;
  }

  return (
    <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 space-y-3">
      <h2 className="font-semibold text-gray-900 text-sm">Evidence packet export</h2>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className={labelCls}>Course</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Branch</label>
          <input value={branchCode} onChange={(e) => setBranchCode(e.target.value)} placeholder="Any" className={inputCls} style={{ width: '110px' }} />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Any" className={inputCls} style={{ width: '90px' }} />
        </div>
        <div>
          <label className={labelCls}>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
          <input type="checkbox" checked={passedOnly} onChange={(e) => setPassedOnly(e.target.checked)} />
          Passing only
        </label>
      </div>
      <div className="flex gap-2">
        <a href={href('pdf')} className="rounded-md bg-gray-900 text-white text-sm px-4 py-2">Download PDF</a>
        <a href={href('csv')} className="rounded-md bg-white border border-gray-300 text-gray-800 text-sm px-4 py-2">Download CSV</a>
      </div>
    </div>
  );
}
