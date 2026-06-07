import { PageHero, Section, SectionHeading, Callout } from '@/components/ui';
import ContactForm from '@/components/ContactForm';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';

export async function generateMetadata() {
  const page = await getCmsPage('support/contact');
  return cmsMetadata(page, {
    title: 'Contact Support | World Direct Link',
    description: 'Contact World Direct Link customer support for help with transfers, tracking, refunds, and general questions.',
  });
}

export default function ContactSupportPage() {
  return (
    <>
      <PageHero
        eyebrow="News & Support"
        title="Contact Support"
        subtitle="We're here to help with transfers, tracking, refunds, and general questions."
      />

      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <SectionHeading title="Claims &amp; Customer Support" />
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-bold text-primary-strong">Toll-Free</dt>
                <dd className="text-muted"><a href={`tel:${company.tollFree}`} className="text-primary hover:underline">{company.tollFree}</a></dd>
              </div>
              <div>
                <dt className="font-bold text-primary-strong">Claims Email</dt>
                <dd className="text-muted"><a href={`mailto:${company.emails.claims}`} className="text-primary hover:underline">{company.emails.claims}</a></dd>
              </div>
              <div>
                <dt className="font-bold text-primary-strong">General Email</dt>
                <dd className="text-muted"><a href={`mailto:${company.email}`} className="text-primary hover:underline">{company.email}</a></dd>
              </div>
              <div>
                <dt className="font-bold text-primary-strong">Mail</dt>
                <dd className="text-muted">
                  Claims Department<br />
                  5405 Memorial Drive, Suite 104<br />
                  Stone Mountain, GA 30083
                </dd>
              </div>
            </dl>
            <div className="mt-6">
              <Callout variant="gold">
                For returns, have your transaction ID, transaction date, and both sender and recipient details ready.
              </Callout>
            </div>
          </div>

          <div>
            <SectionHeading title="Send a message" />
            <ContactForm
              fields={[
                { name: 'name', label: 'Name', type: 'text', required: true },
                { name: 'email', label: 'Email', type: 'email', required: true },
                { name: 'phone', label: 'Phone', type: 'tel', optional: true },
                { name: 'transactionId', label: 'Transaction ID', type: 'text', optional: true },
                { name: 'topic', label: 'Topic', type: 'select', required: true, options: ['General', 'Tracking', 'Refund', 'Claims', 'Other'] },
                { name: 'message', label: 'Message', type: 'textarea', required: true },
              ]}
              submitLabel="Send Message" action="support_contact"
            />
          </div>
        </div>
      </Section>
    </>
  );
}
