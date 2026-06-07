import {
  PageHero,
  Section,
  Container,
  SectionHeading,
  Card,
  CtaBand,
  ButtonOnDark,
} from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';

export async function generateMetadata() {
  const page = await getCmsPage('services');
  return cmsMetadata(page, {
    title: 'Our Services | World Direct Link',
    description: 'World Direct Link makes it simple to support family abroad. Choose the payout method that works best for your recipient: cash pickup, bank deposit, or mobile wallet.',
  });
}

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Our Services"
        subtitle="One link. Every way to deliver."
      />

      <Section>
        <Container>
          <p className="max-w-3xl text-lg text-gray-700">
            World Direct Link makes it simple to support family abroad. All transfers are
            initiated in person at an authorized WDL agent and delivered in U.S. dollars
            through our correspondent network. Choose the payout method that works best for
            your recipient.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <Card title="Send Money" href="/services/send-money">
              Start a transfer in person at any authorized WDL agent.
            </Card>
            <Card title="Cash Pickup" href="/services/cash-pickup">
              Recipients collect funds in U.S. dollars at a payout location.
            </Card>
            <Card title="Bank Deposit" href="/services/bank-deposit">
              Deliver funds directly to a recipient&apos;s bank account where available.
            </Card>
            <Card title="Mobile Wallet Payout" href="/services/mobile-wallet">
              Send to a supported mobile wallet in selected destinations.
            </Card>
          </div>
        </Container>
      </Section>

      <Section muted>
        <Container>
          <SectionHeading
            title="Already sent a transfer?"
            subtitle="Check the status of a transfer you've already started."
          />
          <div className="mt-6 max-w-md">
            <Card title="Track Transfer" href="/services/track">
              Look up the status of a transfer using your transaction ID.
            </Card>
          </div>
        </Container>
      </Section>

      <CtaBand heading="Find an agent to get started">
        <ButtonOnDark href="/agents/become-an-agent">Find an Agent</ButtonOnDark>
      </CtaBand>
    </>
  );
}
