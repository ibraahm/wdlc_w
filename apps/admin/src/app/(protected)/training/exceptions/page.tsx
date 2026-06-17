import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListExceptions, apiListCourses, apiListAgents, type TrainingException, type Course, type AdminAgent } from '@/lib/api';
import ExceptionsManager from '@/components/ExceptionsManager';

export const dynamic = 'force-dynamic';

export default async function ExceptionsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let exceptions: TrainingException[] = [];
  let courses: Course[] = [];
  let agents: AdminAgent[] = [];
  let fetchError = '';
  try {
    [exceptions, courses, agents] = await Promise.all([
      apiListExceptions(session.accessToken),
      apiListCourses(session.accessToken),
      apiListAgents(session.accessToken),
    ]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load exceptions';
  }

  const canDecide = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(session.user.role);
  const canRequest = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'REGIONAL_OFFICER'].includes(session.user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Training Exceptions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Documented, approved deviations from a training requirement. A waiver or equivalency excuses the learner;
          an extension moves their deadline. Only approved, unexpired exceptions affect compliance.
        </p>
      </div>

      {fetchError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{fetchError}</div>}

      <ExceptionsManager
        initialExceptions={exceptions}
        courses={courses.map((c) => ({ id: c.id, title: c.title }))}
        agents={agents.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, email: a.email }))}
        canDecide={canDecide}
        canRequest={canRequest}
      />
    </div>
  );
}
