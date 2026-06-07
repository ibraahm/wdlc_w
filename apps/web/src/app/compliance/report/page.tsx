import type { Metadata } from 'next';
import { PageHero, Section, SectionHeading, Callout, FactTable } from '@/components/ui';
import ContactForm from '@/components/ContactForm';
import { company } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Report Suspicious Activity',
  description: 'Report suspected fraud or suspicious activity involving a World Direct Link transaction, agent, or customer.',
};

export default function ReportPage() {
  return (
    <>
      <PageHero
        eyebrow="Compliance"
        title="Report Suspicious Activity"
        subtitle="Customers, agents, and the public can report directly to our compliance team."
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
        <SectionHeading title="Reporting form" />
        <div className="max-w-2xl space-y-6">
          <ContactForm
            fields={[
              { name: 'reporterName', label: 'Reporter name (optional)', type: 'text', optional: true },
              { name: 'contactInfo', label: 'Contact info', type: 'text', optional: true },
              { name: 'location', label: 'Location or agent involved', type: 'text', optional: true },
              { name: 'dates', label: 'Date(s)', type: 'text', optional: true },
              { name: 'transactionIds', label: 'Transaction ID(s) if known', type: 'text', optional: true },
              { name: 'description', label: 'Description of activity', type: 'textarea', required: true },
            ]}
            submitLabel="Submit Report"
            successMessage="Thank you. Your report has been received and will be reviewed confidentially by our BSA/AML Compliance Officer."
          />
          <Callout variant="gold">
            Reports are reviewed confidentially by our BSA/AML Compliance Officer.
          </Callout>
        </div>
      </Section>
    </>
  );
}
