import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiComplianceSummary, apiListCourses, type ComplianceSummary, type Course } from '@/lib/api';
import EvidenceExport from '@/components/EvidenceExport';

export const dynamic = 'force-dynamic';

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'danger' | 'warn' }) {
  const color = tone === 'danger' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-gray-900';
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

export default async function CompliancePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let summary: ComplianceSummary | null = null;
  let courses: Course[] = [];
  let fetchError = '';
  try {
    [summary, courses] = await Promise.all([
      apiComplianceSummary(session.accessToken),
      apiListCourses(session.accessToken),
    ]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load compliance data';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Completion posture across required training, plus a downloadable, regulator-ready evidence packet.
          {summary && <> Generated {new Date(summary.generatedAt).toLocaleString()}.</>}
        </p>
      </div>

      {fetchError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{fetchError}</div>}

      {summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat label="Required courses" value={summary.totals.courses} />
            <Stat label="Completion" value={`${summary.totals.completionPct}%`} />
            <Stat label="Completed" value={`${summary.totals.completed}/${summary.totals.required}`} />
            <Stat label="Overdue" value={summary.totals.overdue} tone={summary.totals.overdue > 0 ? 'danger' : undefined} />
            <Stat label="Excused" value={summary.totals.excused} />
            <Stat label="Stale content" value={summary.totals.staleCourses} tone={summary.totals.staleCourses > 0 ? 'warn' : undefined} />
          </div>

          <EvidenceExport courses={courses.map((c) => ({ id: c.id, title: c.title }))} />

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="p-3 font-medium">Course</th>
                  <th className="p-3 font-medium">Required</th>
                  <th className="p-3 font-medium">Completion</th>
                  <th className="p-3 font-medium">Overdue</th>
                  <th className="p-3 font-medium">Ack</th>
                  <th className="p-3 font-medium">Due</th>
                  <th className="p-3 font-medium">Content</th>
                </tr>
              </thead>
              <tbody>
                {summary.courses.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-gray-500">No published courses.</td></tr>
                )}
                {summary.courses.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="p-3">
                      <div className="text-gray-800 font-medium">{c.title}</div>
                      <div className="text-xs text-gray-400">{c.category}</div>
                    </td>
                    <td className="p-3 text-gray-600">{c.requiredCount}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${c.completionPct >= 100 ? 'bg-green-500' : 'bg-amber-400'}`} style={{ width: `${c.completionPct}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{c.completedCount}/{c.requiredCount} ({c.completionPct}%)</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {c.overdueCount > 0
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">{c.overdueCount} overdue</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-3 text-gray-600">{c.requireAck ? `${c.ackCount}/${c.requiredCount} (${c.ackPct}%)` : <span className="text-gray-400">n/a</span>}</td>
                    <td className="p-3 text-gray-600">{fmtDate(c.dueAt)}</td>
                    <td className="p-3">
                      {c.stale
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700" title={`Effective ${fmtDate(c.versionEffectiveAt)}`}>Review due</span>
                        : <span className="text-xs text-gray-500">{fmtDate(c.versionEffectiveAt)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
