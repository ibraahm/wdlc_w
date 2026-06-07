import {
  PageHero,
  Section,
  Container,
  Callout,
  CtaBand,
  ButtonOnDark,
} from '@/components/ui';

export const metadata = {
  title: 'Mobile Wallet Payout | World Direct Link',
  description:
    'In selected destinations, recipients can receive funds to a supported mobile wallet through our correspondent network.',
};

export default function MobileWalletPage() {
  return (
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
              Sending is always completed in person at an authorized agent. Mobile wallet refers
              to the recipient&apos;s payout option only.
            </Callout>
          </div>
        </Container>
      </Section>

      <CtaBand heading="Find an Agent">
        <ButtonOnDark href="/agents/become-an-agent">Find an Agent</ButtonOnDark>
      </CtaBand>
    </>
  );
}
