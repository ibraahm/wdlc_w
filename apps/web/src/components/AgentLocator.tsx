'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentLocation } from '@/lib/agents';

// Leaflet is loaded from the unpkg CDN at runtime so we avoid adding a build
// dependency and any Next.js SSR/window issues. OpenStreetMap tiles are free.
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Minimal shape of the Leaflet global we use.
type LeafletMap = {
  setView: (latlng: [number, number], zoom: number) => LeafletMap;
  remove: () => void;
  fitBounds: (bounds: [number, number][], opts?: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    L?: any;
  }
}

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.L) return resolve(window.L);

    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      existing.addEventListener('error', () => reject(new Error('leaflet failed')));
      if (window.L) resolve(window.L);
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('leaflet failed'));
    document.head.appendChild(script);
  });
}

function fullAddress(a: AgentLocation): string {
  return [a.addressLine, a.city, a.state, a.zip].filter(Boolean).join(', ');
}

export default function AgentLocator({ agents }: { agents: AgentLocation[] }) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) =>
      [a.businessName, a.city, a.state, a.zip, a.addressLine]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [agents, query]);

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        const map = L.map(mapEl.current, { scrollWheelZoom: false }).setView([39.5, -98.35], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // (Re)draw markers when the filtered set changes.
  useEffect(() => {
    if (!ready || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = mapRef.current as any;

    Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
    markersRef.current = {};

    const points: [number, number][] = [];
    filtered.forEach((a) => {
      const marker = L.marker([a.latitude, a.longitude]).addTo(map);
      const addr = fullAddress(a);
      marker.bindPopup(
        `<strong>${a.businessName ?? 'WDL Agent'}</strong><br/>${addr}` +
          (a.publicPhone ? `<br/><a href="tel:${a.publicPhone}">${a.publicPhone}</a>` : ''),
      );
      marker.on('click', () => setSelected(a.id));
      markersRef.current[a.id] = marker;
      points.push([a.latitude, a.longitude]);
    });

    if (points.length === 1) {
      map.setView(points[0], 12);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [filtered, ready]);

  // Pan to a selected agent (from the list).
  function focusAgent(a: AgentLocation) {
    setSelected(a.id);
    const map = mapRef.current as any;
    if (map) {
      map.setView([a.latitude, a.longitude], 14);
      const marker = markersRef.current[a.id];
      if (marker) marker.openPopup();
    }
  }

  return (
    <div className="agent-locator">
      <div className="agent-locator-list">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by city, state, ZIP, or name"
          className="agent-locator-search"
          aria-label="Search agent locations"
        />
        <p className="agent-locator-count">
          {filtered.length} {filtered.length === 1 ? 'location' : 'locations'}
        </p>
        <ul className="agent-locator-items">
          {filtered.length === 0 && (
            <li className="agent-locator-empty">No agent locations match your search.</li>
          )}
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => focusAgent(a)}
                className={`agent-locator-item${selected === a.id ? ' is-selected' : ''}`}
              >
                <span className="agent-locator-name">{a.businessName ?? 'WDL Agent'}</span>
                <span className="agent-locator-addr">{fullAddress(a)}</span>
                {a.publicPhone && (
                  <span className="agent-locator-phone">{a.publicPhone}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="agent-locator-map-wrap">
        {failed ? (
          <div className="agent-locator-fallback">
            <p>The map could not be loaded. Agent locations are listed on the left.</p>
          </div>
        ) : (
          <div ref={mapEl} className="agent-locator-map" />
        )}
      </div>
    </div>
  );
}
