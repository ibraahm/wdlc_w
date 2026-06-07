import {
  PageHero,
  Section,
  SectionHeading,
  Steps,
  StatStrip,
  CtaBand,
  ButtonOnDark,
} from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('about/network');
  return cmsMetadata(page, {
    title: 'Our Network | World Direct Link',
    description: 'World Direct Link delivers funds through a vetted foreign correspondent network led by Taaj Financial Services, reaching families around the world.',
  });
}

export default async function NetworkPage() {
  const cmsPage = await getCmsPage('about/network');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero
        eyebrow="About Us"
        title="Our Network"
        subtitle="Reliable delivery through a vetted correspondent network."
      />

      <Section>
        <p className="max-w-3xl text-lg text-gray-700 leading-relaxed">
          World Direct Link delivers funds through a vetted foreign correspondent
          network led by Taaj Financial Services, enabling reliable delivery to
          regions around the world — including areas where conventional banking is
          limited. Our correspondents undergo annual due diligence and ongoing
          risk-based monitoring to protect every transaction.
        </p>
      </Section>

      <Section muted>
        <SectionHeading title="How money moves" />
        <div className="max-w-2xl">
          <Steps
            items={[
              {
                title: 'You send.',
                body: 'Visit an authorized WDL agent and place your transfer in person.',
              },
              {
                title: 'We route.',
                body: 'Your transfer is screened, processed, and routed through our correspondent network.',
              },
              {
                title: 'They receive.',
                body: 'Your recipient collects funds via the available payout method at the destination.',
              },
            ]}
          />
        </div>
      </Section>

      <Section>
        <SectionHeading title="Where we reach" />
        <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-24 text-gray-400">
          [ World coverage map ]
        </div>
      </Section>

      <Section muted>
        <StatStrip
          stats={[
            { value: '20', label: 'Licensed U.S. states' },
            { value: 'International', label: 'Reach' },
            { value: 'USD', label: 'Funds delivered in' },
          ]}
        />
      </Section>

      <CtaBand heading="Find an Agent Near You">
        <ButtonOnDark href="/find-an-agent">Find an Agent</ButtonOnDark>
      </CtaBand>
        </>
      )}
    </>
  );
}
