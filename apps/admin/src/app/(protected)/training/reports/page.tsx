import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiTrainingReport, apiListCourses, apiTrainingCompletions, type TrainingReport, type Course, type Completion } from '@/lib/api';
import TrainingReports from '@/components/TrainingReports';

export const dynamic = 'force-dynamic';

export default async function TrainingReportsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let report: TrainingReport = { courses: [], byState: [], byBranch: [] };
  let courses: Course[] = [];
  let completions: Completion[] = [];
  let error = '';
  try {
    [report, courses, completions] = await Promise.all([
      apiTrainingReport(session.accessToken),
      apiListCourses(session.accessToken),
      apiTrainingCompletions(session.accessToken, {}),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load reports';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Training Reports & Score Tracking</h1>
        <p className="text-sm text-gray-500 mt-1">
          Auditable proof of who completed each course and quiz, with scores. Filter all completions,
          by state, or by agent (branch), and export to CSV for compliance records.
        </p>
      </div>
      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <TrainingReports report={report} courses={courses} initialCompletions={completions} />
      )}
    </div>
  );
}
