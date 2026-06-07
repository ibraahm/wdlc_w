import {
  PageHero,
  Section,
  Container,
  SectionHeading,
  Checklist,
  Callout,
  CtaBand,
  ButtonOnDark,
} from '@/components/ui';

export const metadata = {
  title: 'Send Money | World Direct Link',
  description:
    'Send money quickly and affordably at any authorized WDL agent. Bring a valid photo ID and your recipient’s details to complete the transfer in person.',
};

export default function SendMoneyPage() {
  return (
    <>
      <PageHero eyebrow="Services" title="Send Money" />

      <Section>
        <Container>
          <p className="max-w-3xl text-lg text-gray-700">
            Send money quickly and affordably at any authorized WDL agent. Bring a valid
            government-issued photo ID and your recipient&apos;s details, and our agent will
            help you complete the transfer in person. We accept cash, cashier&apos;s check, or
            personal check (at the agent&apos;s discretion).
          </p>

          <div className="mt-10 max-w-2xl">
            <SectionHeading title="What you'll need" />
            <div className="mt-4">
              <Checklist
                items={[
                  'Valid government-issued photo ID',
                  "Recipient's full name and location/contact details",
                  'The amount you wish to send',
                ]}
              />
            </div>
          </div>

          <div className="mt-8 max-w-3xl">
            <Callout variant="info">
              Before you pay, your agent will disclose all fees and the total your recipient
              will receive.
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
