import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiResource } from '@/lib/api';
import ResourceViewerClient from './ResourceViewerClient';

export const dynamic = 'force-dynamic';

export default async function ResourceViewerPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  try {
    const resource = await apiResource(session.accessToken, params.id);
    return <ResourceViewerClient resource={resource} />;
  } catch {
    notFound();
  }
}
