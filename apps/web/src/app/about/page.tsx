import Link from 'next/link';
import {
  PageHero,
  Section,
  SectionHeading,
  StatStrip,
  Card,
  CtaBand,
  ButtonOnDark,
} from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('about');
  return cmsMetadata(page, {
    title: 'About Us | World Direct Link',
    description: 'World Direct Link is a licensed money transmitter connecting immigrant, refugee, and diaspora communities with their families since 1999.',
  });
}

export default async function AboutPage() {
  const cmsPage = await getCmsPage('about');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
          <PageHero
            eyebrow="About Us"
            title="About World Direct Link"
            subtitle="Connecting communities with the people they love since 1999."
          >
            <ButtonOnDark href="/agents/become-an-agent">Find an Agent</ButtonOnDark>
            <Link
              href="/services/send-money"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Send Money
            </Link>
          </PageHero>

          <Section>
            <p className="max-w-3xl text-lg text-gray-700 leading-relaxed">
              World Direct Link, Corp. is a licensed money transmitter headquartered in
              Stone Mountain, Georgia, dedicated to fast, affordable, and reliable money
              transfers. Founded in 1999, we serve immigrant, refugee, and diaspora
              families across the United States who send support to loved ones abroad —
              with a special focus on the Somali, Ethiopian, and Kenyan communities.
            </p>

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

          <Section muted>
            <SectionHeading title="Explore About Us" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card title="Company Overview" href="/about/company">
                Who we are, our history, leadership, and mission.
              </Card>
              <Card title="Our Network" href="/about/network">
                How funds move through our trusted correspondent network.
              </Card>
              <Card title="Licenses &amp; Registrations" href="/about/licenses">
                Our FinCEN registration and state money transmitter licenses.
              </Card>
              <Card title="Contact Us" href="/about/contact">
                Reach our corporate headquarters and support teams.
              </Card>
            </div>
          </Section>

          <CtaBand heading="Ready to send money home?">
            <ButtonOnDark href="/agents/become-an-agent">Find an Agent</ButtonOnDark>
            <Link
              href="/services/send-money"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-white/50 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Send Money
            </Link>
          </CtaBand>
        </>
      )}
    </>
  );
}
