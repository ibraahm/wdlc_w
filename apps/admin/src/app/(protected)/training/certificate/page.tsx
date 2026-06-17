import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiGetCertificateConfig, type CertConfig } from '@/lib/api';
import CertificateDesigner from '@/components/CertificateDesigner';

export const dynamic = 'force-dynamic';

export default async function CertificatePage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!['SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(session.user.role)) {
    return <div className="text-sm text-gray-600">You don&apos;t have access to certificate settings.</div>;
  }

  let config: CertConfig | null = null;
  let fetchError = '';
  try {
    config = await apiGetCertificateConfig(session.accessToken);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load certificate settings';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Completion Certificate</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload the World Direct Link certificate artwork and position the learner&apos;s name, course, details and
          certificate ID on it. Leave the template empty to use the built-in design.
        </p>
      </div>
      {fetchError && <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{fetchError}</div>}
      {config && <CertificateDesigner initial={config} />}
    </div>
  );
}
