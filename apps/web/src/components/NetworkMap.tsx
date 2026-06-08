'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type NetworkCountryData = {
  name: string;
  payoutTypes: string[];
  flagUrl?: string;
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d3?: any;
  }
}

const PAYOUT_COLORS: Record<string, string> = {
  'Bank Transfer': 'bg-blue-100 text-blue-700',
  'Mobile Money': 'bg-emerald-100 text-emerald-700',
  'Cash Collection': 'bg-amber-100 text-amber-700',
};

// Normalize Nominatim/GeoJSON country names to our DB names.
const GEO_TO_DB: Record<string, string> = {
  'United States': 'United States of America',
  'United States of America': 'United States of America',
  'Somaliland': 'Somalia',
  "Côte d'Ivoire": "Cote d'Ivoire",
  "Ivory Coast": "Cote d'Ivoire",
  'Democratic Republic of the Congo': 'Congo, the Democratic Republic of the',
  'DR Congo': 'Congo, the Democratic Republic of the',
  'Tanzania': 'Tanzania',
  'United Republic of Tanzania': 'Tanzania',
  'UAE': 'United Arab Emirates',
};

function normalizeName(name: string): string {
  return GEO_TO_DB[name] ?? name;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadLink(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}

export default function NetworkMap({ countries }: { countries: NetworkCountryData[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mapInstance = useRef<unknown>(null);
  const geoLayer = useRef<unknown>(null);
  const currentLayer = useRef<unknown>(null);
  const [panel, setPanel] = useState<{ name: string; payoutTypes: string[]; flagUrl?: string } | null>(null);
  const [ready, setReady] = useState(false);

  // Build the lookup once per data change and read it via ref inside Leaflet
  // callbacks (which capture values at init time, not on re-render).
  const countryMap = useMemo(() => {
    const m = new Map<string, NetworkCountryData>();
    for (const c of countries) m.set(c.name, c);
    return m;
  }, [countries]);
  const countryMapRef = useRef(countryMap);
  countryMapRef.current = countryMap;

  useEffect(() => {
    let cancelled = false;
    async function init() {
      loadLink('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      await Promise.all([
        loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'),
        loadScript('https://d3js.org/d3.v7.min.js'),
      ]);
      if (cancelled || !mapRef.current || mapInstance.current) return;

      const L = window.L;
      const d3 = window.d3;

      const map = L.map(mapRef.current, {
        center: [20, 0], zoom: 2, minZoom: 2, maxZoom: 8,
        zoomControl: true, zoomAnimation: true, fadeAnimation: true, worldCopyJump: true,
      });
      mapInstance.current = map;

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '&copy;OpenStreetMap, &copy;CartoDB', subdomains: 'abcd', maxZoom: 19, opacity: 0.8 },
      ).addTo(map);

      function drawConnections() {
        const svgEl = svgRef.current;
        if (!svgEl) return;
        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();
        const defs = svg.append('defs');
        const grad = defs.append('linearGradient').attr('id', 'wdlLineGrad').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
        grad.append('stop').attr('offset', '0%').attr('style', 'stop-color:#0B1F3A;stop-opacity:0.6');
        grad.append('stop').attr('offset', '100%').attr('style', 'stop-color:#C9A84C;stop-opacity:0.6');

        const usaCenter = map.latLngToContainerPoint([38.88, -97.02]);
        if (!geoLayer.current) return;
        let idx = 0;
        (geoLayer.current as { eachLayer: Function }).eachLayer((layer: unknown) => {
          const feat = (layer as { feature: { properties: { name: string } } }).feature;
          const db = normalizeName(feat.properties.name);
          if (!countryMapRef.current.has(db) || db === 'United States of America') return;
          const bounds = (layer as { getBounds: Function }).getBounds();
          const center = [(bounds.getNorth() + bounds.getSouth()) / 2, (bounds.getEast() + bounds.getWest()) / 2];
          const end = map.latLngToContainerPoint(center);
          const dx = end.x - usaCenter.x;
          const mid = [usaCenter.x + dx * 0.5, usaCenter.y + (end.y - usaCenter.y) * 0.5 - Math.abs(dx) * 0.15];
          const lineGen = d3.line().curve(d3.curveBasis).x((d: unknown[]) => d[0] as number).y((d: unknown[]) => d[1] as number);
          const pathD = lineGen([[usaCenter.x, usaCenter.y], mid, [end.x, end.y]] as [number, number][]);
          svg.append('path').attr('d', pathD).attr('fill', 'none').attr('stroke', 'url(#wdlLineGrad)')
            .attr('stroke-width', 1.2).attr('stroke-dasharray', '5,5').attr('opacity', 0.5)
            .attr('style', `animation:wdl-flow ${2 + (idx % 4) * 0.3}s linear infinite`);
          idx++;
        });
      }

      map.on('moveend zoomend', drawConnections);

      const geojson = await fetch('/countries.geo.json').then((r) => r.json());
      if (cancelled) return;

      geoLayer.current = L.geoJSON(geojson, {
        style(feature: unknown) {
          const name = normalizeName((feature as { properties: { name: string } }).properties.name);
          const isUSA = name === 'United States of America';
          const active = countryMapRef.current.has(name);
          return {
            fillColor: isUSA ? '#0B1F3A' : active ? '#C9A84C' : '#e8e8e8',
            color: '#fff', weight: active ? 1 : 0.5, fillOpacity: isUSA ? 0.85 : active ? 0.7 : 0.25,
          };
        },
        onEachFeature(feature: unknown, layer: unknown) {
          const name = normalizeName((feature as { properties: { name: string } }).properties.name);
          const isUSA = name === 'United States of America';
          const data = countryMapRef.current.get(name);
          if (!data && !isUSA) return;

          (layer as { on: Function }).on({
            mouseover() {
              if (layer === currentLayer.current) return;
              (layer as { setStyle: Function }).setStyle({ fillOpacity: 0.85, weight: 2 });
            },
            mouseout() {
              if (layer === currentLayer.current) return;
              (layer as { setStyle: Function }).setStyle({ fillOpacity: isUSA ? 0.85 : 0.7, weight: 1 });
            },
            click() {
              if (currentLayer.current) {
                const prev = currentLayer.current as { setStyle: Function; feature: { properties: { name: string } } };
                const prevName = normalizeName(prev.feature.properties.name);
                const prevUSA = prevName === 'United States of America';
                prev.setStyle({ fillOpacity: prevUSA ? 0.85 : 0.7, weight: 1 });
              }
              (layer as { setStyle: Function }).setStyle({ fillOpacity: 0.9, weight: 2.5 });
              currentLayer.current = layer;
              map.fitBounds((layer as { getBounds: Function }).getBounds(), { padding: [50, 50], maxZoom: 6 });
              setPanel(data ? { ...data } : { name: 'United States', payoutTypes: ['Origin country'], flagUrl: undefined });
            },
          });
        },
      }).addTo(map);

      drawConnections();
      setReady(true);
    }

    init().catch(console.error);
    return () => {
      cancelled = true;
      if (mapInstance.current) {
        (mapInstance.current as { remove: () => void }).remove();
        mapInstance.current = null;
        geoLayer.current = null;
        currentLayer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = countries.filter((c) => c.name !== 'United States of America').length;
  const mobileMoneyCount = countries.filter((c) => c.payoutTypes.includes('Mobile Money')).length;
  const bankCount = countries.filter((c) => c.payoutTypes.includes('Bank Transfer')).length;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#d9e0e8] bg-white shadow-sm">
      <style>{`
        @keyframes wdl-flow {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: -100; }
        }
      `}</style>

      {/* Map */}
      <div className="relative" style={{ height: '70vh', minHeight: 400 }}>
        <div ref={mapRef} className="absolute inset-0" />

        {/* Connection lines SVG overlay */}
        <svg ref={svgRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', zIndex: 999 }} />

        {/* Header card */}
        <div className="absolute top-4 left-4 z-[1000] bg-white rounded-xl shadow-md border-l-4 border-[#C9A84C] p-5 max-w-xs">
          <h2 className="text-xl font-bold text-[#0B1F3A] mb-1">Global Payout Network</h2>
          <p className="text-sm text-gray-600 mb-4">Click a country to see payout details.</p>
          <div className="flex divide-x divide-gray-200">
            <div className="flex-1 text-center px-3">
              <div className="text-2xl font-bold text-[#0B1F3A]">{activeCount}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Countries</div>
            </div>
            <div className="flex-1 text-center px-3">
              <div className="text-2xl font-bold text-[#0B1F3A]">{mobileMoneyCount}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Mobile Money</div>
            </div>
            <div className="flex-1 text-center px-3">
              <div className="text-2xl font-bold text-[#0B1F3A]">{bankCount}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Bank Transfer</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-sm border border-gray-100 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Network</p>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-block h-4 w-4 rounded" style={{ background: '#C9A84C' }} />
            Active payout markets
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-block h-4 w-4 rounded" style={{ background: '#0B1F3A' }} />
            US operations
          </div>
        </div>

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[2000]">
            <div className="text-sm text-gray-400 animate-pulse">Loading map…</div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {panel && (
        <div className="border-t border-[#d9e0e8] bg-gray-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {panel.flagUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={panel.flagUrl} alt={panel.name} className="h-10 w-16 object-cover rounded shadow-sm border border-gray-200" />
              )}
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{panel.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {panel.payoutTypes.map((t) => (
                    <span key={t} className={`rounded-full px-3 py-0.5 text-xs font-semibold ${PAYOUT_COLORS[t] ?? 'bg-gray-100 text-gray-600'}`}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => { setPanel(null); if (currentLayer.current) { const layer = currentLayer.current as { setStyle: Function }; layer.setStyle({ fillOpacity: 0.7, weight: 1 }); currentLayer.current = null; } }} className="rounded-full p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
