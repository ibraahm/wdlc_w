import Link from 'next/link';
import {
  PageHero,
  Section,
  SectionHeading,
  StatStrip,
  FactTable,
  Callout,
  CtaBand,
  ButtonOnDark,
} from '@/components/ui';
import { company, activeJurisdictionCount } from '@/lib/site';

export const metadata = {
  title: 'Our Company | World Direct Link',
  description:
    'World Direct Link, Corp. is a privately held, family-founded money transmitter licensed in the states where it operates, connecting diaspora communities with their families since 1999.',
};

export default function CompanyPage() {
  const activeCount = activeJurisdictionCount;

  return (
    <>
      <PageHero
        eyebrow="About World Direct Link"
        title="A Private Company Built on Trust"
        subtitle="Family-founded and independently operated since 1999 - we answer to our customers, not shareholders."
      >
        <ButtonOnDark href="/agents/become-an-agent">Become an Agent</ButtonOnDark>
        <Link
          href="/services/send-money"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
        >
          Send Money
        </Link>
      </PageHero>

      <StatStrip
        stats={[
          { value: '1999', label: 'Founded' },
          { value: '25+', label: 'Years in Service' },
          { value: String(activeCount), label: 'Licensed Jurisdictions' },
          { value: 'NMLS #' + company.nmls, label: 'MSB Registration' },
        ]}
      />

      <Section>
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-5 text-lg text-gray-700 leading-relaxed">
            <SectionHeading title="Who We Are" />
            <p>
              World Direct Link, Corp. is a privately held, family-founded money transmission business
              incorporated in Georgia on <strong>{company.foundedDisplay}</strong>. We have never taken
              outside investment - every decision is made with the customer in mind, not a quarterly report.
            </p>
            <p>
              We specialize in serving immigrant, refugee, and diaspora communities across the United States,
              providing fast, reliable, and affordable money transfer services to destinations in Africa,
              the Caribbean, and beyond.
            </p>
            <p>
              Our authorized delegate network in states where World Direct Link is licensed forms the
              backbone of our service. Each delegate is vetted, trained, and held to our
              compliance standards to protect every sender and receiver.
            </p>
          </div>

          <FactTable
            rows={[
              { label: 'Legal name', value: company.legalName },
              { label: 'Founded', value: `${company.foundedDisplay} · ${company.foundedState}` },
              { label: 'Ownership', value: 'Privately held - no public equity' },
              { label: 'NMLS ID', value: company.nmls },
              { label: 'FinCEN MSB', value: 'Registered Money Services Business' },
              { label: 'Headquarters', value: `${company.address.line1}, ${company.address.city}, ${company.address.state} ${company.address.zip}` },
              { label: 'Toll-free', value: company.tollFree },
              { label: 'General email', value: company.emails.general },
            ]}
          />
        </div>
      </Section>

      <Section muted>
        <SectionHeading title="What Being Private Means for You" center />
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {[
            {
              icon: '🔒',
              heading: 'No Outside Investors',
              body: 'Our margins go back into better service, lower fees, and compliance - not dividends or venture returns.',
            },
            {
              icon: '📞',
              heading: 'Direct Accountability',
              body: 'When you have a problem, you reach a real person who has authority to fix it - not a call-center script.',
            },
            {
              icon: '⚖️',
              heading: 'Long-term Thinking',
              body: 'We have served the same communities for over 25 years. Our incentive is your loyalty, not short-term growth.',
            },
          ].map(({ icon, heading, body }) => (
            <div key={heading} className="rounded-xl border border-[#d9e0e8] bg-white p-6">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-bold text-primary-strong text-base mb-2">{heading}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <Callout variant="info">
          <strong>Licensed and regulated.</strong> World Direct Link holds active money transmitter
          licenses in {activeCount} U.S. jurisdictions and is registered as a Money Services Business with FinCEN
          (NMLS ID {company.nmls}). License details are available on{' '}
          <a href="https://nmlsconsumeraccess.org" className="underline" target="_blank" rel="noopener noreferrer">
            NMLS Consumer Access
          </a>
          .{' '}
          <Link href="/licenses" className="underline">View our full license list →</Link>
        </Callout>
      </Section>

      <CtaBand
        heading="Ready to send money?"
        subtext="Find an authorized agent near you to send money in person."
      >
        <ButtonOnDark href="/find-an-agent">Find an Agent</ButtonOnDark>
        <Link
          href="/support/contact"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
        >
          Contact Us
        </Link>
      </CtaBand>
    </>
  );
}
