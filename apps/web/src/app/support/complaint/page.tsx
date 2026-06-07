import type { Metadata } from 'next';
import { PageHero, Section, SectionHeading, Callout } from '@/components/ui';
import ContactForm from '@/components/ContactForm';
import { regulators } from '@/lib/site';

export const metadata: Metadata = {
  title: 'File a Complaint',
  description: 'Submit a complaint to World Direct Link, Corp. or contact your state regulatory agency.',
};

export default function ComplaintPage() {
  return (
    <>
      <PageHero
        eyebrow="News & Support"
        title="File a Complaint"
        subtitle="We take every concern seriously. Submit a complaint below, or contact your state regulatory agency directly."
      />

      <Section>
        <div className="max-w-2xl">
          <ContactForm
            fields={[
              { name: 'name', label: 'Name', type: 'text', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'phone', label: 'Phone', type: 'tel', optional: true },
              { name: 'transactionId', label: 'Transaction ID', type: 'text', optional: true },
              { name: 'agentLocation', label: 'Agent / location', type: 'text', optional: true },
              { name: 'nature', label: 'Nature of complaint', type: 'select', required: true, options: ['Transaction issue', 'Fee dispute', 'Agent conduct', 'Refund', 'Other'] },
              { name: 'description', label: 'Description', type: 'textarea', required: true },
              { name: 'file', label: 'Supporting file (optional)', type: 'file', optional: true },
            ]}
            submitLabel="Submit Complaint" action="complaint_form"
            successMessage="We've received your complaint and will respond within 5 business days."
          />
        </div>
      </Section>

      <Section muted>
        <SectionHeading title="Contact your state regulatory agency" />
        <div className="overflow-x-auto border border-[#d9e0e8] rounded-xl">
          <table className="w-full min-w-[560px] border-collapse bg-white">
            <thead>
              <tr className="bg-primary text-white text-sm">
                <th className="px-4 py-3 text-left font-bold">State</th>
                <th className="px-4 py-3 text-left font-bold">Regulator contact</th>
              </tr>
            </thead>
            <tbody>
              {regulators.map((r, i) => (
                <tr key={r.state} className={i % 2 === 0 ? 'bg-[#f5f7fa]' : 'bg-white'}>
                  <td className="px-4 py-3 text-sm font-medium text-primary-strong border-b border-[#d9e0e8]">{r.state}</td>
                  <td className="px-4 py-3 text-sm text-muted border-b border-[#d9e0e8]">{r.contact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 max-w-2xl">
          <Callout variant="gold">
            You may also contact the Consumer Financial Protection Bureau at 855-411-2372 ·{' '}
            <a href="https://www.consumerfinance.gov" target="_blank" rel="noopener noreferrer" className="underline">consumerfinance.gov</a>
          </Callout>
        </div>
      </Section>
    </>
  );
}
