'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, LayerGroup as LeafletLayerGroup } from 'leaflet';
import type * as D3 from 'd3';

export type PayoutDetails = {
  mobileMoney?: string[];
  cashPartner?: string;
  bankName?: string;
};

export type NetworkCountryData = {
  name: string;
  payoutTypes: string[];
  payoutDetails?: PayoutDetails;
  flagUrl?: string;
};

const PAYOUT_COLORS: Record<string, string> = {
  'Bank Transfer': 'bg-blue-100 text-blue-700',
  'Mobile Money': 'bg-emerald-100 text-emerald-700',
  'Cash Collection': 'bg-amber-100 text-amber-700',
};

const COUNTRY_CODES: Record<string, string> = {
  Angola: 'AO',
  Australia: 'AU',
  Austria: 'AT',
  Belgium: 'BE',
  Benin: 'BJ',
  Canada: 'CA',
  Chad: 'TD',
  China: 'CN',
  'Congo, the Democratic Republic of the': 'CD',
  "Cote d'Ivoire": 'CI',
  Denmark: 'DK',
  Djibouti: 'DJ',
  Egypt: 'EG',
  Finland: 'FI',
  France: 'FR',
  Germany: 'DE',
  Ghana: 'GH',
  Greece: 'GR',
  India: 'IN',
  Indonesia: 'ID',
  Ireland: 'IE',
  Italy: 'IT',
  Kenya: 'KE',
  Kuwait: 'KW',
  Malaysia: 'MY',
  Malta: 'MT',
  Mozambique: 'MZ',
  Netherlands: 'NL',
  Nigeria: 'NG',
  Norway: 'NO',
  Oman: 'OM',
  'Saudi Arabia': 'SA',
  Senegal: 'SN',
  Somalia: 'SO',
  'South Africa': 'ZA',
  'South Sudan': 'SS',
  Sudan: 'SD',
  Sweden: 'SE',
  Switzerland: 'CH',
  Tanzania: 'TZ',
  Thailand: 'TH',
  Togo: 'TG',
  Turkey: 'TR',
  Uganda: 'UG',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
  'United States of America': 'US',
  Yemen: 'YE',
  Zambia: 'ZM',
};

const GEO_TO_DB: Record<string, string> = {
  'United States': 'United States of America',
  'United States of America': 'United States of America',
  'Somaliland': 'Somalia',
  "Côte d'Ivoire": "Cote d'Ivoire",
  'Ivory Coast': "Cote d'Ivoire",
  'Democratic Republic of the Congo': 'Congo, the Democratic Republic of the',
  'DR Congo': 'Congo, the Democratic Republic of the',
  'Tanzania': 'Tanzania',
  'United Republic of Tanzania': 'Tanzania',
  'UAE': 'United Arab Emirates',
};

function normalizeName(name: string): string {
  return GEO_TO_DB[name] ?? name;
}

function flagImageUrl(country: string): string {
  const code = COUNTRY_CODES[normalizeName(country)]?.toLowerCase();
  return code ? `https://flagcdn.com/w80/${code}.png` : '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeFlagUrl(flagUrl?: string): string {
  if (!flagUrl) return '';
  try {
    const url = new URL(flagUrl, window.location.origin);
    if (url.protocol === 'http:' || url.protocol === 'https:' || flagUrl.startsWith('/')) {
      return flagUrl;
    }
  } catch {
    return '';
  }
  return '';
}


function FlagMark({
  country,
  flagUrl,
}: {
  country: string;
  flagUrl?: string;
}) {
  const safeUrl = flagUrl || flagImageUrl(country);
  const sizeClass = 'h-10 w-14 text-3xl';

  if (safeUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={safeUrl}
        alt={`${country} flag`}
        className={`${sizeClass} flex-shrink-0 rounded-md border border-gray-200 object-cover shadow-sm`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} inline-flex flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white shadow-sm`}
      aria-label={`${country} flag`}
      title={country}
    >
      {country.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function NetworkMap({ countries }: { countries: NetworkCountryData[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const geoLayer = useRef<LeafletGeoJSON | null>(null);
  const flagLayer = useRef<LeafletLayerGroup | null>(null);
  const currentLayer = useRef<unknown>(null);
  const [panel, setPanel] = useState<NetworkCountryData | null>(null);
  const [ready, setReady] = useState(false);

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
      // Dynamic imports keep Leaflet/D3 out of the SSR bundle
      const [L, d3Module] = await Promise.all([
        import('leaflet'),
        import('d3'),
      ]);
      const d3 = d3Module as typeof D3;

      if (cancelled || !mapRef.current || mapInstance.current) return;

      const map = L.map(mapRef.current, {
        center: [20, 0], zoom: 2, minZoom: 2, maxZoom: 8,
        zoomControl: true, zoomAnimation: true, fadeAnimation: true, worldCopyJump: true,
      });
      mapInstance.current = map;

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '&copy;OpenStreetMap, &copy;CartoDB', subdomains: 'abcd', maxZoom: 19, opacity: 0.8 },
      ).addTo(map);
      flagLayer.current = L.layerGroup().addTo(map);

      function selectCountry(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        layer: any,
        data: NetworkCountryData | undefined,
      ) {
        if (currentLayer.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prev = currentLayer.current as any;
          const prevName = normalizeName(prev.feature.properties.name as string);
          const prevUSA = prevName === 'United States of America';
          prev.setStyle({ fillOpacity: prevUSA ? 0.85 : 0.7, weight: 1 });
        }

        layer.setStyle({ fillOpacity: 0.9, weight: 2.5 });
        currentLayer.current = layer;
        map.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 6 });
        setPanel(data ? { ...data } : { name: 'United States', payoutTypes: ['Origin country'], flagUrl: undefined });
      }


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
        geoLayer.current.eachLayer((layer) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const l = layer as any;
          const feat = l.feature as { properties: { name: string } };
          const db = normalizeName(feat.properties.name);
          if (!countryMapRef.current.has(db) || db === 'United States of America') return;
          const bounds = l.getBounds() as { getNorth: () => number; getSouth: () => number; getEast: () => number; getWest: () => number };
          const center: [number, number] = [(bounds.getNorth() + bounds.getSouth()) / 2, (bounds.getEast() + bounds.getWest()) / 2];
          const end = map.latLngToContainerPoint(center);
          const dx = end.x - usaCenter.x;
          const mid: [number, number] = [usaCenter.x + dx * 0.5, usaCenter.y + (end.y - usaCenter.y) * 0.5 - Math.abs(dx) * 0.15];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lineGen = d3.line<any>().curve(d3.curveBasis).x((d) => d[0]).y((d) => d[1]);
          const pathD = lineGen([[usaCenter.x, usaCenter.y], mid, [end.x, end.y]]);
          svg.append('path').attr('d', pathD ?? '').attr('fill', 'none').attr('stroke', 'url(#wdlLineGrad)')
            .attr('stroke-width', 1.2).attr('stroke-dasharray', '5,5').attr('opacity', 0.5)
            .attr('style', `animation:wdl-flow ${2 + (idx % 4) * 0.3}s linear infinite`);
          idx++;
        });
      }

      map.on('moveend zoomend', drawConnections);

      const geojson = await fetch('/countries.geo.json').then((r) => r.json());
      if (cancelled) return;

      geoLayer.current = L.geoJSON(geojson, {
        style(feature) {
          const name = normalizeName((feature as { properties: { name: string } }).properties.name);
          const isUSA = name === 'United States of America';
          const active = countryMapRef.current.has(name);
          return {
            fillColor: isUSA ? '#0B1F3A' : active ? '#C9A84C' : '#e8e8e8',
            color: '#fff', weight: active ? 1 : 0.5, fillOpacity: isUSA ? 0.85 : active ? 0.7 : 0.25,
          };
        },
        onEachFeature(feature, layer) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const l = layer as any;
          const name = normalizeName((feature as { properties: { name: string } }).properties.name);
          const isUSA = name === 'United States of America';
          const data = countryMapRef.current.get(name);
          if (!data && !isUSA) return;

          l.on({
            mouseover() {
              if (layer === currentLayer.current) return;
              l.setStyle({ fillOpacity: 0.85, weight: 2 });
            },
            mouseout() {
              if (layer === currentLayer.current) return;
              l.setStyle({ fillOpacity: isUSA ? 0.85 : 0.7, weight: 1 });
            },
            click() {
              selectCountry(l, data);
            },
          });
        },
      }).addTo(map);

      // Fill each covered country's shape with its flag (SVG pattern), so the
      // polygon shows the flag's colors instead of a flat gold fill. Leaflet
      // writes options.fillColor straight to the SVG `fill`, so a url(#pattern)
      // reference works and survives later setStyle calls.
      function applyFlagFills() {
        if (!geoLayer.current || !mapInstance.current) return;
        const svg = mapInstance.current.getPanes().overlayPane.querySelector('svg');
        if (!svg) return;
        const NS = 'http://www.w3.org/2000/svg';
        let defs = svg.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS(NS, 'defs');
          svg.insertBefore(defs, svg.firstChild);
        }
        geoLayer.current.eachLayer((layer) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const l = layer as any;
          const name = normalizeName(l.feature.properties.name as string);
          const data = countryMapRef.current.get(name);
          if (!data) return; // leave USA (origin) and uncovered countries as-is
          const code = COUNTRY_CODES[name]?.toLowerCase();
          const flag = safeFlagUrl(data.flagUrl) || (code ? `https://flagcdn.com/w320/${code}.png` : '');
          if (!flag) return;
          const id = `wdlflag-${code || name.replace(/[^a-z0-9]/gi, '')}`;
          if (!defs!.querySelector(`#${id}`)) {
            const pat = document.createElementNS(NS, 'pattern');
            pat.setAttribute('id', id);
            pat.setAttribute('patternContentUnits', 'objectBoundingBox');
            pat.setAttribute('width', '1');
            pat.setAttribute('height', '1');
            const img = document.createElementNS(NS, 'image');
            img.setAttribute('href', flag);
            img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', flag);
            // Stretch to the country's bounding box (then clipped to its borders)
            // - reliable across browsers; the flag's colors always fill the shape.
            img.setAttribute('preserveAspectRatio', 'none');
            img.setAttribute('width', '1');
            img.setAttribute('height', '1');
            pat.appendChild(img);
            defs!.appendChild(pat);
          }
          l.setStyle({ fillColor: `url(#${id})`, fillOpacity: 1, weight: 1, color: '#ffffff' });
        });
      }

      drawConnections();
      applyFlagFills();
      map.on('zoomend moveend', applyFlagFills);
      setReady(true);
    }

    init().catch(console.error);
    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        geoLayer.current = null;
        flagLayer.current = null;
        currentLayer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = countries.length;
  const mobileMoneyCount = countries.filter((c) => c.payoutTypes.includes('Mobile Money')).length;
  const bankCount = countries.filter((c) => c.payoutTypes.includes('Bank Transfer')).length;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#d9e0e8] bg-white shadow-sm">
      <style>{`
        @keyframes wdl-flow {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: -100; }
        }
        .wdl-map-flag-icon {
          background: transparent;
          border: 0;
        }
        .wdl-map-flag-marker {
          align-items: center;
          background: rgba(255,255,255,0.94);
          border: 1px solid rgba(11,31,58,0.18);
          border-radius: 8px;
          box-shadow: 0 4px 14px rgba(11,31,58,0.18);
          color: #0B1F3A;
          cursor: pointer;
          display: inline-flex;
          font-size: 21px;
          height: 28px;
          justify-content: center;
          line-height: 1;
          overflow: hidden;
          transition: transform 160ms ease, box-shadow 160ms ease;
          width: 36px;
        }
        .wdl-map-flag-marker:hover {
          box-shadow: 0 7px 20px rgba(11,31,58,0.25);
          transform: translateY(-1px) scale(1.06);
        }
        .wdl-map-flag-marker img {
          height: 100%;
          object-fit: cover;
          width: 100%;
        }
      `}</style>

      <div className="relative" style={{ height: '70vh', minHeight: 400 }}>
        <div ref={mapRef} className="absolute inset-0" />
        <svg ref={svgRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', zIndex: 500 }} />

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

      {panel && (
        <div className="border-t border-[#d9e0e8] bg-gray-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <FlagMark country={panel.name} flagUrl={panel.flagUrl} />
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{panel.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {panel.payoutTypes.map((t) => (
                    <span key={t} className={`rounded-full px-3 py-0.5 text-xs font-semibold ${PAYOUT_COLORS[t] ?? 'bg-gray-100 text-gray-600'}`}>{t}</span>
                  ))}
                </div>
                {/* Per-type detail lines */}
                <div className="mt-3 space-y-1.5 text-sm">
                  {panel.payoutDetails?.mobileMoney?.length ? (
                    <div className="flex items-start gap-1.5 text-emerald-700">
                      <span className="mt-0.5 text-base leading-none">📱</span>
                      <span>{panel.payoutDetails.mobileMoney.join(' · ')}</span>
                    </div>
                  ) : null}
                  {panel.payoutDetails?.cashPartner ? (
                    <div className="flex items-start gap-1.5 text-amber-700">
                      <span className="mt-0.5 text-base leading-none">💵</span>
                      <span>{panel.payoutDetails.cashPartner}</span>
                    </div>
                  ) : null}
                  {panel.payoutDetails?.bankName ? (
                    <div className="flex items-start gap-1.5 text-blue-700">
                      <span className="mt-0.5 text-base leading-none">🏦</span>
                      <span>{panel.payoutDetails.bankName}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setPanel(null);
                if (currentLayer.current) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (currentLayer.current as any).setStyle({ fillOpacity: 0.7, weight: 1 });
                  currentLayer.current = null;
                }
              }}
              className="rounded-full p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
