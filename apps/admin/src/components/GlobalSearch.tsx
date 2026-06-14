'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminSearchAction } from '@/lib/actions';
import type { SearchResult } from '@/lib/api';

const TYPE_STYLE: Record<string, string> = {
  Application: 'bg-blue-50 text-blue-700',
  'DD file': 'bg-purple-50 text-purple-700',
  'Portal user': 'bg-green-50 text-green-700',
  'Teller app': 'bg-amber-50 text-amber-700',
};

// CRM-style global search across applications, DD files, portal users, and
// teller applications. Debounced, keyboard-navigable.
export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await adminSearchAction(term);
      setResults(res.results ?? []);
      setActive(0);
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      // "/" focuses search (unless typing in a field)
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  function go(r: SearchResult) {
    setOpen(false);
    setQ('');
    router.push(r.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true); }}
        onKeyDown={onKeyDown}
        placeholder="Search agents, applications…  ( / )"
        className="w-full rounded-lg border border-smoke bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        aria-label="Global search"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-[min(420px,90vw)] right-0 max-h-[70vh] overflow-auto rounded-xl border border-smoke bg-white shadow-lg">
          {loading ? (
            <p className="px-4 py-3 text-sm text-charcoal/50">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-charcoal/50">No matches for “{q}”.</p>
          ) : (
            <ul className="divide-y divide-smoke">
              {results.map((r, i) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    onClick={() => go(r)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-start gap-3 px-3 py-2 text-left ${i === active ? 'bg-ivory' : ''}`}
                  >
                    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_STYLE[r.type] ?? 'bg-gray-100 text-gray-600'}`}>{r.type}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-navy">{r.title}</span>
                      <span className="block truncate text-xs text-charcoal/55">{r.subtitle}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-charcoal/45">{r.badge}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
