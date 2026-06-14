import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import PortalShell from '@/components/PortalShell';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const { agent } = session;

  return (
    <PortalShell agent={{ firstName: agent.firstName, lastName: agent.lastName, email: agent.email }}>
      {children}
    </PortalShell>
  );
}
