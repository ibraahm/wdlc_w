import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiResources, type ResourceItem } from '@/lib/api';
import ResourcesClient from './ResourcesClient';

export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let resources: ResourceItem[];
  try {
    resources = await apiResources(session.accessToken);
  } catch {
    resources = [];
  }

  return <ResourcesClient resources={resources} />;
}
