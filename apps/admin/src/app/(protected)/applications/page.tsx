import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListApplications, type AgentApplication } from '@/lib/api';
import ApplicationsManager from '@/components/ApplicationsManager';
import OnboardingFlow from '@/components/OnboardingFlow';

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams?: { application?: string };
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  let applications: AgentApplication[] = [];
  let archivedApplications: AgentApplication[] = [];
  let error = '';

  try {
    [applications, archivedApplications] = await Promise.all([
      apiListApplications(session.accessToken),
      apiListApplications(session.accessToken, true),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load applications';
  }

  const role = session.user.role;
  const canApprove = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(role);
  const canManage = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER'].includes(role);
  const canHardDelete = role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Agent Applications</h1>
        <p className="admin-section-subtitle">
          Review public Become an Agent submissions, confirm the owner and address details, and approve qualified leads into due diligence.
        </p>
      </div>

      <OnboardingFlow active="applications" />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <ApplicationsManager
          applications={applications}
          archivedApplications={archivedApplications}
          canApprove={canApprove}
          canManage={canManage}
          canHardDelete={canHardDelete}
          initialExpandedId={searchParams?.application}
        />
      )}
    </div>
  );
}
