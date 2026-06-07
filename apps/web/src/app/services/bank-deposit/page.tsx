import {
  PageHero,
  Section,
  Container,
  Callout,
  CtaBand,
  ButtonOnDark,
} from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';

export async function generateMetadata() {
  const page = await getCmsPage('services/bank-deposit');
  return cmsMetadata(page, {
    title: 'Bank Deposit | World Direct Link',
    description: 'Where available through our correspondent network, funds can be delivered directly to a recipient\'s bank account.',
  });
}

export default async function BankDepositPage() {
  const cmsPage = await getCmsPage('services/bank-deposit');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero eyebrow="Services" title="Bank Deposit" />

      <Section>
        <Container>
          <p className="max-w-3xl text-lg text-gray-700">
            Where available through our correspondent network, funds can be delivered directly
            to a recipient&apos;s bank account. Provide the recipient&apos;s account details at
            the time of sending, and our agent will confirm availability for the destination.
          </p>

          <div className="mt-8 max-w-3xl">
            <Callout variant="info">
              Deposit availability and timing depend on the destination and receiving
              institution.
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
