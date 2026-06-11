import {
  PageHero,
  Section,
  Container,
  Callout,
  CtaBand,
  ButtonOnDark,
} from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('services/mobile-wallet');
  return cmsMetadata(page, {
    title: 'Mobile Wallet Payout | World Direct Link',
    description: 'In selected destinations, recipients can receive funds to a supported mobile wallet through our correspondent network.',
  });
}

export default async function MobileWalletPage() {
  const cmsPage = await getCmsPage('services/mobile-wallet');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero eyebrow="Services" title="Mobile Wallet Payout" />

      <Section>
        <Container>
          <p className="max-w-3xl text-lg text-gray-700">
            In selected destinations, recipients can receive funds to a supported mobile wallet
            through our correspondent network. Ask your WDL agent whether mobile wallet payout
            is available for your recipient&apos;s location.
          </p>

          <div className="mt-8 max-w-3xl">
            <Callout variant="info">
              Sending is always completed in person at an authorized delegate. Mobile wallet refers
              to the recipient&apos;s payout option only.
            </Callout>
          </div>
        </Container>
      </Section>

      <CtaBand heading="Find an Agent">
        <ButtonOnDark href="/find-an-agent">Find an Agent</ButtonOnDark>
      </CtaBand>
        </>
      )}
    </>
  );
}
