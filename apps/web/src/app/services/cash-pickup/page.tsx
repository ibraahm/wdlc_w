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
  const page = await getCmsPage('services/cash-pickup');
  return cmsMetadata(page, {
    title: 'Cash Pickup | World Direct Link',
    description: 'Recipients can collect funds in U.S. dollars at a participating payout location in our correspondent network.',
  });
}

export default async function CashPickupPage() {
  const cmsPage = await getCmsPage('services/cash-pickup');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero eyebrow="Services" title="Cash Pickup" />

      <Section>
        <Container>
          <p className="max-w-3xl text-lg text-gray-700">
            Your recipient can collect funds in U.S. dollars at a participating payout location
            in our correspondent network. They&apos;ll need a valid ID and the transaction
            reference details you provide at the time of sending.
          </p>

          <div className="mt-8 max-w-3xl">
            <Callout variant="info">
              Recipients may receive less due to fees charged by the recipient&apos;s bank and
              foreign taxes, as disclosed on your receipt.
            </Callout>
          </div>
        </Container>
      </Section>

      <CtaBand heading="Find an Agent">
        <ButtonOnDark href="/agents/become-an-agent">Find an Agent</ButtonOnDark>
      </CtaBand>
        </>
      )}
    </>
  );
}
