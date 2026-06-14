import { getSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { apiGetDDFile, type DDFile } from '@/lib/api';
import DDFileDetail from '@/components/DDFileDetail';

export default async function DDFileDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  let file: DDFile;
  try {
    file = await apiGetDDFile(session.accessToken, params.id);
  } catch {
    notFound();
  }

  const canManageLifecycle = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(session.user.role);

  return <DDFileDetail initialFile={file} canManageLifecycle={canManageLifecycle} currentUser={session.user.name} />;
}
