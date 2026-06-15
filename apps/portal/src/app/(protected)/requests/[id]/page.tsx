import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiGetRequest } from '@/lib/api';
import RequestDetailClient from './RequestDetailClient';

export const dynamic = 'force-dynamic';

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');
  try {
    const request = await apiGetRequest(session.accessToken, params.id);
    return <RequestDetailClient request={request} />;
  } catch {
    notFound();
  }
}
