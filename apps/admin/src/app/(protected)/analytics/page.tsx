import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { apiGetAnalyticsSummary, type AnalyticsSummary } from '@/lib/api';

const PORTAL_LABELS: Record<string, string> = {
  web: 'Public Website',
  agent: 'Agent Portal',
  admin: 'Admin',
};

const RANGES = [7, 30, 90];

let regionNames: Intl.DisplayNames | null = null;
function countryName(code: string): string {
  try {
    regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { days: daysParam } = await searchParams;
  const days = RANGES.includes(Number(daysParam)) ? Number(daysParam) : 30;

  let data: AnalyticsSummary | null = null;
  let fetchError = '';
  try {
    data = await apiGetAnalyticsSummary(session.accessToken, days);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load analytics';
  }

  const peakDay = data?.daily.reduce<{ date: string; visits: number } | null>(
    (max, d) => (!max || d.visits > max.visits ? d : max),
    null,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitor Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">
            Page views across the public website, agent portal, and admin — last {days} days.
            Cookieless and first-party; country is approximate (derived from IP at the CDN).
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/analytics?days=${r}`}
              className={`px-3 py-1.5 text-sm rounded-md ${
                r === days ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total page views" value={data.totalVisits.toLocaleString()} />
            <StatCard label="Unique visitors (approx.)" value={data.uniqueVisitors.toLocaleString()} />
            <StatCard label="Countries seen" value={data.topCountries.length} />
            <StatCard
              label="Busiest day"
              value={peakDay ? `${peakDay.visits} (${peakDay.date})` : '—'}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* By portal */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 text-sm mb-4">Visits by property</h2>
              {data.byPortal.length === 0 ? (
                <p className="text-sm text-gray-500">No visits recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.byPortal.map((p) => (
                    <li key={p.portal} className="flex justify-between text-sm">
                      <span className="text-gray-700">{PORTAL_LABELS[p.portal] ?? p.portal}</span>
                      <span className="font-medium text-gray-900">{p.visits.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Top countries */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 text-sm mb-4">Top countries</h2>
              {data.topCountries.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No country data yet. Country requires a CDN/edge geo header (e.g. Cloudflare
                  <span className="font-mono"> CF-IPCountry</span>).
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.topCountries.map((c) => (
                    <li key={c.country} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {countryName(c.country)} <span className="text-gray-400">({c.country})</span>
                      </span>
                      <span className="font-medium text-gray-900">{c.visits.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Top pages */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Top pages</h2>
            {data.topPaths.length === 0 ? (
              <p className="text-sm text-gray-500">No visits recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Property</th>
                    <th className="pb-2 font-medium">Path</th>
                    <th className="pb-2 font-medium text-right">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPaths.map((p, i) => (
                    <tr key={`${p.portal}-${p.path}-${i}`} className="border-b border-gray-50">
                      <td className="py-2 text-gray-500">{PORTAL_LABELS[p.portal] ?? p.portal}</td>
                      <td className="py-2 text-gray-800 font-mono text-xs break-all">{p.path}</td>
                      <td className="py-2 text-right font-medium text-gray-900">
                        {p.visits.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
