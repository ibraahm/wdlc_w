import { PageHero, Section, SectionHeading, Callout, FactTable } from '@/components/ui';
import ContactForm from '@/components/ContactForm';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('compliance/report');
  return cmsMetadata(page, {
    title: 'Report Fraud or File a Complaint | World Direct Link',
    description: 'Report fraud, suspicious activity, transaction concerns, refund issues, or agent complaints to World Direct Link.',
  });
}

export default async function ReportPage() {
  const cmsPage = await getCmsPage('compliance/report');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero
        eyebrow="Compliance"
        title="Report Fraud or File a Complaint"
        subtitle="One secure intake for fraud concerns, suspicious activity, transaction complaints, refund issues, and agent conduct."
      />

      <Section>
        <div className="max-w-3xl space-y-6">
          <FactTable
            rows={[
              { label: 'Email', value: <a className="text-primary hover:underline" href={`mailto:${company.emails.compliance}`}>{company.emails.compliance}</a> },
              { label: 'Fax', value: company.complianceFax },
              { label: 'Phone', value: <a className="text-primary hover:underline" href={`tel:${company.tollFree}`}>{company.tollFree}</a> },
            ]}
          />
        </div>
      </Section>

      <Section muted>
        <SectionHeading title="Report or complaint form" />
        <div className="max-w-2xl space-y-6">
          <ContactForm
            fields={[
              { name: 'issueType', label: 'What are you reporting?', type: 'select', required: true, options: ['Fraud or scam', 'Suspicious activity', 'Transaction issue', 'Refund or fee issue', 'Agent conduct', 'Other complaint'] },
              { name: 'reporterName', label: 'Your name', type: 'text', optional: true },
              { name: 'email', label: 'Email', type: 'email', optional: true },
              { name: 'phone', label: 'Phone', type: 'tel', optional: true },
              { name: 'location', label: 'Agent / location involved', type: 'text', optional: true },
              { name: 'dates', label: 'Date(s)', type: 'text', optional: true },
              { name: 'transactionIds', label: 'Transaction ID(s) if known', type: 'text', optional: true },
              { name: 'description', label: 'What happened?', type: 'textarea', required: true },
            ]}
            submitLabel="Submit Report or Complaint" action="report_or_complaint"
            formSlug="suspicious-activity-report"
            successMessage="Thank you. Your report or complaint has been received and will be reviewed by the appropriate World Direct Link team."
          />
          <Callout variant="gold">
            Fraud and suspicious activity reports are reviewed confidentially by Compliance. Customer complaints are routed for follow-up and response.
          </Callout>
        </div>
      </Section>

      <Section>
        <SectionHeading
          title="Licenses & regulatory disclosures"
          subtitle="For state license details, regulator contacts, and required disclosures, use the central licenses page."
        />
        <Callout variant="gold">
          View all license and regulatory information at{' '}
          <a href="/licenses" className="font-semibold underline">worlddirectlink.com/licenses</a>.
        </Callout>
      </Section>
        </>
      )}
    </>
  );
}
