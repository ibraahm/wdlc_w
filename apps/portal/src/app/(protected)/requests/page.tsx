import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiListRequests, type AgentRequest } from '@/lib/api';
import RequestsClient from './RequestsClient';

export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let requests: AgentRequest[] = [];
  try {
    requests = await apiListRequests(session.accessToken);
  } catch {
    requests = [];
  }

  return <RequestsClient requests={requests} />;
}
