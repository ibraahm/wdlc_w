import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { logoutAction } from '@/lib/actions';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const { agent } = session;

  return (
    <div className="portal-layout">
      <header className="portal-topbar">
        <div className="portal-topbar-brand">
          World Direct Link
          <span>Agent Training Portal</span>
        </div>
        <div className="portal-topbar-right">
          <span className="portal-topbar-user">{agent.firstName} {agent.lastName}</span>
          <form action={logoutAction}>
            <button type="submit" className="portal-logout-btn">Sign Out</button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
