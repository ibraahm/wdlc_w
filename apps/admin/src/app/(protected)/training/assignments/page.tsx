import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListAssignments, apiListCourses, apiListAgents, type TrainingAssignment, type Course, type AdminAgent } from '@/lib/api';
import AssignmentsManager from '@/components/AssignmentsManager';

export const dynamic = 'force-dynamic';

export default async function AssignmentsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let assignments: TrainingAssignment[] = [];
  let courses: Course[] = [];
  let agents: AdminAgent[] = [];
  let fetchError = '';
  try {
    [assignments, courses, agents] = await Promise.all([
      apiListAssignments(session.accessToken),
      apiListCourses(session.accessToken),
      apiListAgents(session.accessToken),
    ]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load assignments';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Training Assignments</h1>
        <p className="text-gray-500 text-sm mt-1">
          Assign required training to an agent or a branch with a reason and deadline. This is layered on top of
          audience targeting — assignments add rationale and due dates, and the reason is shown to the learner and
          recorded for audit.
        </p>
      </div>

      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{fetchError}</div>
      )}

      <AssignmentsManager
        initialAssignments={assignments}
        courses={courses.map((c) => ({ id: c.id, title: c.title }))}
        agents={agents.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, email: a.email, branchCode: null }))}
      />
    </div>
  );
}
