import { PageHero, Section, SectionHeading, Callout, Accordion, Checklist, CtaBand, ButtonOnDark } from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('compliance/fraud');
  return cmsMetadata(page, {
    title: 'Protect Yourself from Fraud | World Direct Link',
    description: 'Stay alert to common money-transfer scams and learn how to protect yourself when sending money with World Direct Link.',
  });
}

export default async function FraudPage() {
  const cmsPage = await getCmsPage('compliance/fraud');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero
        eyebrow="Compliance"
        title="Protect Yourself from Fraud"
        subtitle="Stay alert, stay safe."
      />

      <Section>
        <div className="max-w-3xl">
          <Callout variant="warning">
            Never send money to someone you haven&apos;t met in person or to claim a &ldquo;prize,&rdquo;
            loan, job, or emergency you can&apos;t verify. Once funds are picked up, they generally cannot
            be recovered. If something feels wrong, stop and contact us.
          </Callout>
        </div>
      </Section>

      <Section muted>
        <SectionHeading title="Common scams to watch for" />
        <Accordion
          items={[
            {
              q: 'Lottery, prize, or sweepstakes "fees"',
              a: 'Scammers claim you have won a prize but demand an upfront payment for taxes or fees before you can collect — legitimate lotteries never require you to pay to receive winnings.',
            },
            {
              q: 'Romance and online relationship requests',
              a: 'Someone you have met online builds trust over time, then asks you to wire money for travel, medical bills, or an emergency they will never repay.',
            },
            {
              q: 'Fake emergencies impersonating family or officials',
              a: 'A caller pretends to be a relative in trouble or a government agent demanding immediate payment, pressuring you to send money before you can verify the story.',
            },
            {
              q: 'Job offers requiring upfront payment',
              a: 'A "job" asks you to pay for training, equipment, or processing fees, or to forward funds you receive — a sign the position is not real.',
            },
            {
              q: 'Overpayment and check-refund schemes',
              a: 'A buyer "accidentally" overpays with a check and asks you to wire back the difference, leaving you liable when the original check bounces.',
            },
          ]}
        />
      </Section>

      <Section>
        <SectionHeading title="Tips" />
        <div className="max-w-3xl">
          <Checklist
            items={[
              'Verify the request',
              'Never share your transaction ID with strangers',
              'Ask your agent if unsure',
            ]}
          />
        </div>
      </Section>

      <CtaBand heading="See something suspicious?">
        <ButtonOnDark href="/compliance/report">Report or File a Complaint</ButtonOnDark>
        <a
          href="/support/contact"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-white text-white font-semibold hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
        >
          Contact Us
        </a>
      </CtaBand>
        </>
      )}
    </>
  );
}
