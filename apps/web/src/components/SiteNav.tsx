import Link from 'next/link';
import { headerNav, company } from '@/lib/site';
import { getCmsNav, type CmsNavItem } from '@/lib/cms';

type NavNode = { label: string; href: string; children?: { label: string; href: string }[] };

function toNavNodes(items: CmsNavItem[]): NavNode[] {
  return items.map((item) => ({
    label: item.label,
    href: item.href,
    children: item.children?.filter((c) => c.visible).map((c) => ({ label: c.label, href: c.href })),
  }));
}

export default async function SiteNav() {
  const cmsItems = await getCmsNav();
  const nav: NavNode[] = cmsItems && cmsItems.length > 0 ? toNavNodes(cmsItems) : headerNav;

  return (
    <>
      <header className="site-header" data-header>
        <Link className="brand" href="/" aria-label="Home">
          <span className="brand-main">{company.shortName}</span>
          <span className="brand-sub">{company.tagline}</span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          {nav.map((item) =>
            item.children && item.children.length > 0 ? (
              <div className="nav-item" key={item.href}>
                <Link href={item.href}>{item.label}</Link>
                <div className="nav-dropdown">
                  {item.children.map((child) => (
                    <Link key={child.href} href={child.href}>{child.label}</Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            )
          )}
        </nav>

        <Link className="nav-cta" href="/agents/become-an-agent">Find an Agent</Link>

        <button
          className="menu-button"
          type="button"
          aria-label="Open menu"
          aria-expanded="false"
          data-menu-button
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div className="mobile-panel" data-mobile-panel>
        {nav.map((item) => (
          <div key={item.href}>
            <Link href={item.href}>{item.label}</Link>
            {item.children && item.children.length > 0 && (
              <div className="mobile-sub" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', paddingLeft: '16px' }}>
                {item.children.map((child) => (
                  <Link key={child.href} href={child.href}>{child.label}</Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
