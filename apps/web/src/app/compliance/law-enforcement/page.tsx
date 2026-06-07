import type { Metadata } from 'next';
import { PageHero, Section, SectionHeading, Steps, Callout } from '@/components/ui';
import { company } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Law Enforcement Requests',
  description: 'How law enforcement agencies can submit lawful records requests to World Direct Link, Corp.',
};

export default function LawEnforcementPage() {
  return (
    <>
      <PageHero
        eyebrow="Compliance"
        title="Law Enforcement Requests"
        subtitle="World Direct Link cooperates fully with lawful requests from local, state, and federal law enforcement."
      />

      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <SectionHeading title="How to submit a request" />
            <Steps
              items={[
                { title: 'Direct all records requests, subpoenas, summonses, and warrants to the BSA/AML Compliance Officer.' },
                { title: 'Include the requesting agency, point of contact, and any case or reference number.' },
                { title: 'We will acknowledge receipt and coordinate a timely response.' },
              ]}
            />
          </div>

          <div>
            <SectionHeading title="Contact" />
            <Callout variant="gold">
              <strong>Attn: BSA/AML Compliance Officer</strong><br />
              {company.legalName}<br />
              {company.address.line1}<br />
              {company.address.city}, {company.address.state} {company.address.zip}<br /><br />
              <a href={`mailto:${company.emails.compliance}`} className="underline">{company.emails.compliance}</a><br />
              <a href={`tel:${company.tollFree}`} className="underline">{company.tollFree}</a>
            </Callout>
          </div>
        </div>
      </Section>
    </>
  );
}
