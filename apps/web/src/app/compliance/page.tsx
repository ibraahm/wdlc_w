import { PageHero, Section, SectionHeading, Checklist, Callout, Card } from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('compliance');
  return cmsMetadata(page, {
    title: 'Compliance & Anti-Money Laundering | World Direct Link',
    description: 'World Direct Link maintains a comprehensive, risk-based BSA/AML compliance program.',
  });
}

export default async function CompliancePage() {
  const cmsPage = await getCmsPage('compliance');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero
        eyebrow="Compliance"
        title="Compliance & Anti-Money Laundering"
        subtitle="Compliance you can count on."
      />

      <Section>
        <div className="max-w-3xl space-y-6">
          <p className="text-lg text-gray-700 leading-relaxed">
            World Direct Link, Corp. maintains a comprehensive, risk-based compliance program designed
            to prevent the misuse of our services for money laundering, terrorist financing, or other
            illegal activity. Our program is approved by our Board of Directors, administered by our
            designated BSA/AML Compliance Officer, and reviewed independently on a regular basis.
          </p>
        </div>
      </Section>

      <Section muted>
        <SectionHeading title="Our program covers" />
        <Checklist
          items={[
            'Bank Secrecy Act (BSA) and Anti-Money Laundering (AML) policies',
            'USA PATRIOT Act obligations and Customer Identification',
            'OFAC sanctions screening on every transaction (sender and recipient)',
            'Currency Transaction Reports (CTRs) and Suspicious Activity Reports (SARs)',
            'Agent due diligence, training, and ongoing monitoring',
            'Five-year recordkeeping and regulatory cooperation',
          ]}
        />
        <div className="mt-8 max-w-3xl">
          <Callout variant="info">
            Every transaction is screened against OFAC&apos;s SDN and related lists, regardless of amount.
          </Callout>
        </div>
      </Section>

      <Section>
        <SectionHeading title="Explore our compliance resources" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card title="Fraud & Consumer Scams" href="/compliance/fraud">
            Learn how to spot and avoid common money-transfer scams.
          </Card>
          <Card title="Report Suspicious Activity" href="/compliance/report">
            Confidentially report fraud or suspicious transactions to our compliance team.
          </Card>
          <Card title="Agent Regulatory Notices" href="/compliance/notices">
            Posting requirements and compliance updates for authorized agents.
          </Card>
          <Card title="Law Enforcement Requests" href="/compliance/law-enforcement">
            How to submit records requests, subpoenas, and warrants.
          </Card>
          <Card title="Compliance Resources" href="/compliance/resources">
            References for customers, agents, and partners.
          </Card>
        </div>
      </Section>
        </>
      )}
    </>
  );
}
