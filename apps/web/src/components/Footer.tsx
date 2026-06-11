import Link from 'next/link';
import { footerNav, company } from '@/lib/site';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <strong>{company.shortName}</strong>
            <span className="footer-brand-sub">{company.tagline}</span>
            <p style={{ marginBottom: '12px' }}>
              {company.address.line1}<br />
              {company.address.city}, {company.address.state} {company.address.zip}
            </p>
            <p>
              <a href={`tel:${company.tollFree}`}>{company.tollFree}</a><br />
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </p>
          </div>

          {footerNav.map((col) => (
            <nav key={col.title}>
              <span className="footer-col-label">{col.title}</span>
              <div className="footer-links">
                {col.links.map((link) => (
                  <Link key={link.href} href={link.href}>{link.label}</Link>
                ))}
              </div>
            </nav>
          ))}
        </div>

        <div className="footer-bottom">
          <p style={{ margin: 0 }}>
            {company.legalName} · NMLS #{company.nmls} ·{' '}
            <a href="https://www.nmlsconsumeraccess.org" target="_blank" rel="noopener noreferrer">
              Verify on NMLS
            </a>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <span>&copy; {year} {company.legalName}</span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/legal/cookies">Cookies</Link>
            <Link href="/legal/electronic-communications">E-Sign Consent</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/accessibility">Accessibility</Link>
            <Link href="/licenses">Licenses &amp; Regulatory Disclosures</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
