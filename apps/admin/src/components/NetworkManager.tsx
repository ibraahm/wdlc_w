'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { NetworkCountry, PayoutDetails } from '@/lib/api';
import { createNetworkCountryAction, updateNetworkCountryAction, deleteNetworkCountryAction } from '@/lib/actions';

const PAYOUT_TYPES = ['Cash Collection', 'Mobile Money', 'Bank Transfer'];
const MOBILE_MONEY_PROVIDERS = ['M-Pesa', 'MTN Mobile Money', 'Airtel Money', 'Orange Money', 'Tigo Pesa', 'Wave', 'EcoCash', 'Telebirr'];
const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const BLANK: Partial<NetworkCountry> = { name: '', payoutTypes: ['Cash Collection'], payoutDetails: {}, flagUrl: '', active: true };

export default function NetworkManager({ countries }: { countries: NetworkCountry[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Partial<NetworkCountry>>(BLANK);

  const filtered = countries.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  function openNew() { setForm(BLANK); setEditId('new'); setError(''); }
  function openEdit(c: NetworkCountry) { setForm({ ...c, payoutDetails: c.payoutDetails ?? {} }); setEditId(c.id); setError(''); }
  function close() { setEditId(null); setError(''); }

  function togglePayout(type: string) {
    const current = form.payoutTypes ?? [];
    setForm((prev) => ({
      ...prev,
      payoutTypes: current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    }));
  }

  function toggleMobileMoney(provider: string) {
    const current = form.payoutDetails?.mobileMoney ?? [];
    setForm((prev) => ({
      ...prev,
      payoutDetails: {
        ...prev.payoutDetails,
        mobileMoney: current.includes(provider) ? current.filter((p) => p !== provider) : [...current, provider],
      },
    }));
  }

  function setDetail(key: keyof PayoutDetails, value: string) {
    setForm((prev) => ({ ...prev, payoutDetails: { ...prev.payoutDetails, [key]: value } }));
  }

  function save() {
    if (!form.name?.trim()) { setError('Country name is required.'); return; }
    if (!form.payoutTypes?.length) { setError('Select at least one payout type.'); return; }
    setError('');
    startTransition(async () => {
      const res = editId === 'new'
        ? await createNetworkCountryAction(form)
        : await updateNetworkCountryAction(editId!, form);
      if (!res.ok) { setError(res.error ?? 'Save failed'); return; }
      close();
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Remove "${name}" from the network map?`)) return;
    startTransition(async () => {
      const res = await deleteNetworkCountryAction(id);
      if (!res.ok) setError(res.error ?? 'Delete failed');
      else router.refresh();
    });
  }

  const hasMobile = (form.payoutTypes ?? []).includes('Mobile Money');
  const hasCash = (form.payoutTypes ?? []).includes('Cash Collection');
  const hasBank = (form.payoutTypes ?? []).includes('Bank Transfer');

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search countries…" className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" />
        <button onClick={openNew} className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90 whitespace-nowrap">+ Add country</button>
      </div>

      {editId && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
          <h3 className="font-semibold text-gray-800">{editId === 'new' ? 'New country' : 'Edit country'}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Country name *</label>
              <input value={form.name ?? ''} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="e.g. Kenya" />
            </div>
            <div>
              <label className={labelCls}>Flag image URL</label>
              <input value={form.flagUrl ?? ''} onChange={(e) => setForm((p) => ({ ...p, flagUrl: e.target.value }))} className={inputCls} placeholder="https://…" />
            </div>
          </div>

          {/* Payout types */}
          <div>
            <label className={labelCls}>Payout types *</label>
            <div className="flex flex-wrap gap-4 pt-1">
              {PAYOUT_TYPES.map((t) => (
                <label key={t} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={(form.payoutTypes ?? []).includes(t)} onChange={() => togglePayout(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>

          {/* Mobile Money — providers */}
          {hasMobile && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
              <label className="block text-xs font-semibold text-emerald-800 mb-2">Mobile Money providers</label>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {MOBILE_MONEY_PROVIDERS.map((p) => (
                  <label key={p} className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={(form.payoutDetails?.mobileMoney ?? []).includes(p)}
                      onChange={() => toggleMobileMoney(p)}
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Cash Collection — partner name */}
          {hasCash && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <label className={labelCls + ' text-amber-800'}>Cash payout partner name</label>
              <input
                value={form.payoutDetails?.cashPartner ?? ''}
                onChange={(e) => setDetail('cashPartner', e.target.value)}
                className={inputCls}
                placeholder="e.g. Dahabshiil, Western Union agent, etc."
              />
            </div>
          )}

          {/* Bank Transfer — bank name */}
          {hasBank && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <label className={labelCls + ' text-blue-800'}>Bank / financial institution name</label>
              <input
                value={form.payoutDetails?.bankName ?? ''}
                onChange={(e) => setDetail('bankName', e.target.value)}
                className={inputCls}
                placeholder="e.g. Equity Bank, KCB, etc."
              />
            </div>
          )}

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={!!form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
            Active (shown on map)
          </label>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={save} disabled={isPending} className="rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button onClick={close} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 font-medium">Payout types & details</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No countries match.</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className={`border-b border-gray-100 last:border-0 ${!c.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.payoutTypes.map((t) => (
                        <span key={t} className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium">{t}</span>
                      ))}
                    </div>
                    {c.payoutDetails?.mobileMoney?.length ? (
                      <p className="mt-1 text-[11px] text-emerald-700">{c.payoutDetails.mobileMoney.join(', ')}</p>
                    ) : null}
                    {c.payoutDetails?.cashPartner ? (
                      <p className="mt-1 text-[11px] text-amber-700">{c.payoutDetails.cashPartner}</p>
                    ) : null}
                    {c.payoutDetails?.bankName ? (
                      <p className="mt-1 text-[11px] text-blue-700">{c.payoutDetails.bankName}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(c)} className="text-xs text-navy hover:underline">Edit</button>
                      <button onClick={() => remove(c.id, c.name)} disabled={isPending} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} of {countries.length} countries</p>
    </div>
  );
}
