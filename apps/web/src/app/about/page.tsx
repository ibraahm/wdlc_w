import Link from 'next/link';
import {
  PageHero,
  Section,
  SectionHeading,
  StatStrip,
  FactTable,
  Steps,
  Callout,
  ButtonPrimary,
  ButtonOnDark,
  CtaBand,
} from '@/components/ui';
import { getCmsPage, getCmsNetworkCountries, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';
import NetworkMap from '@/components/NetworkMap';

export async function generateMetadata() {
  const page = await getCmsPage('about');
  return cmsMetadata(page, {
    title: 'About Us | World Direct Link',
    description: 'World Direct Link is a licensed money transmitter connecting immigrant, refugee, and diaspora communities with their families since 1999.',
  });
}

export default async function AboutPage() {
  const [cmsPage, networkCountries] = await Promise.all([
    getCmsPage('about'),
    getCmsNetworkCountries(),
  ]);
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0
    ? cmsPage.blocks as { type: string; data: Record<string, unknown> }[]
    : null;

  if (cmsBlocks) {
    return <BlockRenderer blocks={cmsBlocks} />;
  }

  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="About World Direct Link"
        subtitle="Connecting communities with the people they love since 1999."
      >
        <ButtonOnDark href="/find-an-agent">Find an Agent</ButtonOnDark>
        <Link
          href="/services/send-money"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
        >
          Send Money
        </Link>
      </PageHero>

      {/* Who we are */}
      <Section>
        <div className="max-w-3xl space-y-6 text-lg text-gray-700 leading-relaxed">
          <p>
            World Direct Link, Corp. is a privately held, for-profit corporation
            organized under the laws of the State of Georgia on November 2, 1999, to
            operate an international money transfer business. The company was originally
            named Warsan Fast Track, Inc., later North American Money Transfer, Inc.
            (2001), and adopted its current name, World Direct Link, Corp., effective
            February 14, 2018.
          </p>
          <p>
            We are a principal money transmitter and a registered Money Services
            Business (MSB) with the U.S. Department of the Treasury&apos;s Financial
            Crimes Enforcement Network (FinCEN). Our services are offered exclusively
            in U.S. dollars through our authorized delegate network, with payouts
            delivered through our trusted foreign correspondent network.
          </p>
        </div>

        <div className="mt-10">
          <StatStrip
            stats={[
              { value: 'Licensed in 20 states', label: 'Money transmitter' },
              { value: 'Since 1999', label: 'Serving diaspora families' },
              { value: 'Trusted', label: 'Correspondent network' },
            ]}
          />
        </div>
      </Section>

      {/* At a glance */}
      <Section muted>
        <SectionHeading title="At a glance" />
        <FactTable
          rows={[
            { label: 'Founded', value: 'November 2, 1999' },
            { label: 'Headquarters', value: 'Stone Mountain, Georgia, USA' },
            { label: 'Structure', value: 'Privately held corporation' },
            { label: 'Registration', value: 'FinCEN-registered MSB · NMLS ID 1119263' },
            { label: 'Primary service', value: 'International & domestic money remittance (USD)' },
          ]}
        />
      </Section>

      {/* Mission */}
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

      {/* Global payout network map */}
      <Section>
        <SectionHeading title="Global Payout Network" subtitle="Explore the countries where your family can receive funds through our correspondent network." />
        <NetworkMap countries={networkCountries} />
      </Section>

      {/* Network */}
      <Section muted>
        <SectionHeading title="How money moves" />
        <p className="max-w-3xl text-lg text-gray-700 leading-relaxed mb-8">
          World Direct Link delivers funds through a vetted foreign correspondent
          network led by Taaj Financial Services, enabling reliable delivery to
          regions around the world — including areas where conventional banking is
          limited. Our correspondents undergo annual due diligence and ongoing
          risk-based monitoring to protect every transaction.
        </p>
        <div className="max-w-2xl">
          <Steps
            items={[
              { title: 'You send.', body: 'Visit an authorized WDL agent and place your transfer in person.' },
              { title: 'We route.', body: 'Your transfer is screened, processed, and routed through our correspondent network.' },
              { title: 'They receive.', body: 'Your recipient collects funds via the available payout method at the destination.' },
            ]}
          />
        </div>
      </Section>

      {/* Licenses & regulatory disclosures live on their own page (/licenses). */}
      <Section muted>
        <SectionHeading title="Licenses & Regulatory Disclosures" />
        <p className="max-w-3xl text-lg text-gray-700 leading-relaxed mb-6">
          World Direct Link, Corp. is a FinCEN-registered Money Services Business and a
          state-licensed money transmitter (NMLS ID 1119263). View our licenses by state
          and required consumer disclosures on our dedicated page.
        </p>
        <ButtonPrimary href="/licenses">View Licenses &amp; Regulatory Disclosures</ButtonPrimary>
      </Section>

      <CtaBand heading="Ready to send money home?">
        <ButtonOnDark href="/find-an-agent">Find an Agent</ButtonOnDark>
        <Link
          href="/services/send-money"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-white/50 text-white font-semibold hover:bg-white/10 transition-colors"
        >
          Send Money
        </Link>
      </CtaBand>
    </>
  );
}
