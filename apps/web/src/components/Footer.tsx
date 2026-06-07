import Link from 'next/link';
import { footerNav, company } from '@/lib/site';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Brand + columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-10">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="text-white font-bold text-lg hover:text-primary transition-colors">
              {company.shortName}
            </Link>
            <p className="mt-2 text-sm italic text-gray-500">{company.tagline}</p>
            <p className="mt-4 text-sm leading-relaxed">
              {company.address.line1}<br />
              {company.address.city}, {company.address.state} {company.address.zip}
            </p>
            <p className="mt-3 text-sm">
              Toll-Free: <a href={`tel:${company.tollFree}`} className="hover:text-white">{company.tollFree}</a><br />
              <a href={`mailto:${company.email}`} className="hover:text-white">{company.email}</a>
            </p>
          </div>

          {footerNav.map((col) => (
            <div key={col.title}>
              <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">{col.title}</h3>
              <ul className="space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-white transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* License line */}
        <div className="pt-8 border-t border-gray-800">
          <p className="text-sm text-gray-500">
            {company.legalName} is a licensed money transmitter. NMLS ID #{company.nmls}.{' '}
            <a href="https://www.nmlsconsumeraccess.org" target="_blank" rel="noopener noreferrer" className="hover:text-white underline">
              Verify on NMLS Consumer Access
            </a>
            .
          </p>
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm">&copy; {year} {company.legalName}. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span aria-hidden="true">&middot;</span>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <span aria-hidden="true">&middot;</span>
              <Link href="/about/licenses" className="hover:text-white transition-colors">Licenses &amp; Disclosures</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
