import {
  PageHero,
  Section,
  SectionHeading,
  FactTable,
  Callout,
  Card,
} from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';

export async function generateMetadata() {
  const page = await getCmsPage('about/company');
  return cmsMetadata(page, {
    title: 'Company Overview | World Direct Link',
    description: 'World Direct Link, Corp. is a privately held, FinCEN-registered money services business and licensed money transmitter founded in Georgia in 1999.',
  });
}

export default function CompanyOverviewPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Company Overview"
        subtitle="A trusted money transmitter built for the communities we serve."
      />

      <Section>
        <div className="max-w-3xl space-y-6 text-lg text-gray-700 leading-relaxed">
          <p>
            World Direct Link, Corp. is a privately held, for-profit corporation
            organized under the laws of the State of Georgia on November 2, 1999, to
            operate an international money transfer business. The company was
            originally named Warsan Fast Track, Inc., later North American Money
            Transfer, Inc. (2001), and adopted its current name, World Direct Link,
            Corp., effective February 14, 2018.
          </p>
          <p>
            We are a principal money transmitter and a registered Money Services
            Business (MSB) with the U.S. Department of the Treasury&apos;s Financial
            Crimes Enforcement Network (FinCEN). Our services are offered exclusively
            in U.S. dollars through a network of authorized agents, with payouts
            delivered through our trusted foreign correspondent network.
          </p>
        </div>
      </Section>

      <Section muted>
        <SectionHeading title="At a glance" />
        <FactTable
          rows={[
            { label: 'Founded', value: 'November 2, 1999' },
            { label: 'Headquarters', value: 'Stone Mountain, Georgia, USA' },
            { label: 'Structure', value: 'Privately held corporation' },
            {
              label: 'Registration',
              value: 'FinCEN-registered MSB · NMLS ID 1119263',
            },
            {
              label: 'Primary service',
              value: 'International & domestic money remittance (USD)',
            },
          ]}
        />
      </Section>

      <Section>
        <SectionHeading title="Our mission" />
        <Callout variant="info">
          We are dedicated to providing fast, affordable, and reliable money transfer
          services to immigrants, refugees, and diaspora communities who support their
          families and loved ones. Through our correspondent network, we reach regions
          where traditional financial institutions do not operate. Our success is
          measured by clients choosing us for our price, service, and expertise.
        </Callout>
      </Section>

      <Section muted>
        <SectionHeading title="Leadership" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card title="President">Executive leadership and corporate strategy.</Card>
          <Card title="VP / CEO">Day-to-day operations and corporate governance.</Card>
          <Card title="CFO">Financial management and reporting.</Card>
          <Card title="BSA / Compliance Officer">
            Anti-money-laundering program and regulatory oversight.
          </Card>
        </div>
      </Section>
    </>
  );
}
