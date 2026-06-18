import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ChangePasswordClient from './ChangePasswordClient';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <ChangePasswordClient />;
}
