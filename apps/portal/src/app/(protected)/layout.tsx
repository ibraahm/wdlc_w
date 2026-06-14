import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { logoutAction } from '@/lib/actions';
import PortalNav from '@/components/PortalNav';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const { agent } = session;

  return (
    <div className="portal-layout">
      <a href="#portal-main" className="portal-skip-link">Skip to content</a>
      <header className="portal-topbar">
        <a href="/dashboard" className="portal-topbar-brand" aria-label="World Direct Link Agent Portal — home">
          World Direct Link
          <span>Agent Portal</span>
        </a>
        <PortalNav />
        <div className="portal-topbar-right">
          <span className="portal-topbar-user" title={agent.email}>{agent.firstName} {agent.lastName}</span>
          <form action={logoutAction}>
            <button type="submit" className="portal-logout-btn">Sign Out</button>
          </form>
        </div>
      </header>
      <main id="portal-main">{children}</main>
    </div>
  );
}
