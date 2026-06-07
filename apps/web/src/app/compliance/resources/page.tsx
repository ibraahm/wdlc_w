import { PageHero, Section, SectionHeading } from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';

export async function generateMetadata() {
  const page = await getCmsPage('compliance/resources');
  return cmsMetadata(page, {
    title: 'Compliance Resources | World Direct Link',
    description: 'Helpful compliance references for customers, agents, and partners of World Direct Link, Corp.',
  });
}

const resources = [
  { title: 'FinCEN', body: 'Financial Crimes Enforcement Network', href: 'https://www.fincen.gov' },
  { title: 'OFAC', body: 'Office of Foreign Assets Control — U.S. Department of the Treasury', href: 'https://ofac.treasury.gov' },
  { title: 'Consumer Financial Protection Bureau', body: 'Consumer financial education and complaint submission', href: 'https://www.consumerfinance.gov' },
  { title: 'NMLS Consumer Access', body: 'Verify World Direct Link licenses and registration', href: 'https://www.nmlsconsumeraccess.org' },
  { title: 'WDL Help Center', body: 'Consumer disclosures and refund / error-resolution policy', href: '/support/help' },
];

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Compliance"
        title="Compliance Resources"
        subtitle="Helpful references for customers, agents, and partners."
      />

      <Section>
        <SectionHeading title="External references" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map((r) => {
            const external = r.href.startsWith('http');
            return (
              <a
                key={r.title}
                href={r.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="block bg-white border border-[#d9e0e8] rounded-xl p-6 shadow-sm hover:shadow-md hover:border-secondary/60 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-[#fff4cc] flex items-center justify-center mb-3 text-primary font-black text-lg">
                  {external ? '↗' : '→'}
                </div>
                <h3 className="font-bold text-primary-strong">{r.title}</h3>
                <p className="mt-1 text-muted text-sm">{r.body}</p>
              </a>
            );
          })}
        </div>
      </Section>
    </>
  );
}
