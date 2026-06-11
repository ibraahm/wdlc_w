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
  let error = '';

  try {
    applications = await apiListApplications(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load applications';
  }

  const canApprove = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(session.user.role);

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
          canApprove={canApprove}
          initialExpandedId={searchParams?.application}
        />
      )}
    </div>
  );
}
