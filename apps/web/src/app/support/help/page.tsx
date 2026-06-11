import { PageHero, Section, SectionHeading, Accordion, CtaBand, ButtonOnDark } from '@/components/ui';
import Link from 'next/link';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('support/help');
  return cmsMetadata(page, {
    title: 'Help Center | World Direct Link',
    description: 'Find answers about sending money, fees, refunds, and your consumer rights with World Direct Link.',
  });
}

const rights = [
  {
    title: 'Pre-payment disclosure',
    body: 'Before you pay, you\'ll receive disclosure of all fees, any applicable taxes, and the total amount your recipient will receive. Transfers are denominated and paid in U.S. dollars.',
  },
  {
    title: 'Cancellation',
    body: 'You can cancel for a full refund within 30 minutes of payment, unless the funds have already been picked up or deposited.',
  },
  {
    title: 'Error resolution',
    body: 'If you think there\'s an error, contact us within 180 days. We\'ll investigate and resolve within 10 days of receiving your written request.',
  },
  {
    title: 'Refunds',
    body: 'For returns not at our fault, the transmittal amount (excluding commissions) is refunded; if the error was ours, all funds including commissions are refunded.',
  },
];

const faqs = [
  {
    q: 'How do I send money?',
    a: 'Visit any authorized WDL agent in person. Bring a valid government-issued photo ID and your recipient\'s name and contact details. Your agent will walk you through the transfer and provide a receipt with all fees and amounts disclosed upfront.',
  },
  {
    q: 'What ID do I need?',
    a: 'A valid, unexpired government-issued photo ID is required. Acceptable forms include a passport, driver\'s license, or state-issued ID card.',
  },
  {
    q: 'How do I track a transfer?',
    a: 'Use your transaction ID — found on your receipt — at our Track Transfer page, or call 800-939-7185 for immediate help.',
  },
  {
    q: 'Why might my recipient get less than I sent?',
    a: 'Recipients may receive less due to fees charged by the recipient\'s bank or foreign taxes. All applicable fees are disclosed on your receipt at the time of sending.',
  },
  {
    q: 'How do I cancel or get a refund?',
    a: 'You may cancel within 30 minutes of payment for a full refund, as long as the funds have not already been picked up. Contact the authorized delegate location where you sent the transfer or call 800-939-7185.',
  },
];

export default async function HelpPage() {
  const cmsPage = await getCmsPage('support/help');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero
        eyebrow="News & Support"
        title="Help Center"
        subtitle="Find answers about sending, receiving, fees, refunds, and your consumer rights."
      />

      <Section muted>
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              disabled
              placeholder="Search help articles…"
              className="w-full pl-10 pr-4 py-3 border border-[#d9e0e8] rounded-lg bg-white text-muted cursor-not-allowed"
            />
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading title="Your rights as a sender" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {rights.map((r) => (
            <div key={r.title} className="bg-white border border-[#d9e0e8] rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-primary-strong">{r.title}</h3>
              <p className="mt-2 text-muted text-sm leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section muted>
        <SectionHeading title="Frequently asked questions" />
        <div className="max-w-2xl">
          <Accordion items={faqs} />
          <p className="mt-6 text-xs italic text-muted">
            Recipients may receive less than the amount sent due to fees charged by the recipient&apos;s bank and foreign taxes, as disclosed on your receipt.
          </p>
        </div>
      </Section>

      <CtaBand heading="Still need help?">
        <ButtonOnDark href="/support/contact">Contact Us</ButtonOnDark>
        <Link
          href="/compliance/report"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/50 text-white font-bold hover:bg-white/10 transition-colors"
        >
          Report or File a Complaint
        </Link>
      </CtaBand>
        </>
      )}
    </>
  );
}
