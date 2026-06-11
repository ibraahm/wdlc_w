import Link from 'next/link';
import { PageHero, Section, SectionHeading, Callout } from '@/components/ui';
import ContactForm, { type Field } from '@/components/ContactForm';
import HQMap from '@/components/HQMap';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('support/contact');
  return cmsMetadata(page, {
    title: 'Contact Us | World Direct Link',
    description: 'Contact World Direct Link headquarters, customer support, claims, or general support from one place.',
  });
}

const fields: Field[] = [
  { name: 'name', label: 'Full Name', type: 'text', required: true },
  { name: 'email', label: 'Email Address', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel', optional: true },
  { name: 'topic', label: 'Topic', type: 'select', required: true, options: ['General', 'Tracking', 'Refund', 'Claims', 'Agent support', 'Other'] },
  { name: 'transactionId', label: 'Transaction ID', type: 'text', optional: true },
  { name: 'subject', label: 'Subject', type: 'text', optional: true },
  { name: 'message', label: 'Message', type: 'textarea', required: true },
];

export default async function ContactPage() {
  const cmsPage = await getCmsPage('support/contact');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
          <PageHero
            eyebrow="Support"
            title="Contact Us"
            subtitle="Reach our headquarters, customer support, claims team, or general inbox from one place."
          />

          <Section>
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <SectionHeading title="Corporate Headquarters" />
                  <div className="space-y-3 text-gray-700">
                    <p className="font-semibold text-gray-900">{company.legalName}</p>
                    <address className="not-italic leading-relaxed">
                      {company.address.line1}
                      <br />
                      {company.address.city}, {company.address.state} {company.address.zip}
                    </address>
                    <dl className="space-y-1">
                      <div>
                        <span className="font-medium text-gray-900">Toll-Free: </span>
                        <a href={`tel:${company.tollFree}`} className="text-primary hover:underline">
                          {company.tollFree}
                        </a>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Phone: </span>
                        <a href={`tel:${company.phone}`} className="text-primary hover:underline">
                          {company.phone}
                        </a>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Fax: </span>
                        {company.fax}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Email: </span>
                        <a href={`mailto:${company.email}`} className="text-primary hover:underline">
                          {company.email}
                        </a>
                      </div>
                    </dl>
                  </div>
                </div>

                <div>
                  <SectionHeading title="Customer support & claims" />
                  <dl className="space-y-3 text-sm text-gray-700">
                    <div>
                      <dt className="font-bold text-primary-strong">Support phone</dt>
                      <dd>
                        <a href={`tel:${company.tollFree}`} className="text-primary hover:underline">
                          {company.tollFree}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold text-primary-strong">Claims email</dt>
                      <dd>
                        <a href={`mailto:${company.emails.claims}`} className="text-primary hover:underline">
                          {company.emails.claims}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold text-primary-strong">Mail</dt>
                      <dd>
                        Claims Department<br />
                        {company.address.line1}<br />
                        {company.address.city}, {company.address.state} {company.address.zip}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <Callout variant="gold">
                      For transaction help, include your transaction ID, transaction date, and sender or recipient details when available.
                    </Callout>
                  </div>
                </div>

                <div>
                  <HQMap />
                </div>

                <p className="text-sm text-gray-600">
                  For fraud, suspicious activity, agent conduct, or complaint escalation, use{' '}
                  <Link href="/compliance/report" className="text-primary hover:underline">
                    Report or File a Complaint
                  </Link>
                  .
                </p>
              </div>

              <div>
                <SectionHeading title="Send a message" />
                <ContactForm
                  fields={fields}
                  submitLabel="Send Message"
                  action="form_submit"
                  formSlug="contact-us"
                  successMessage="Thanks for reaching out. We will get back to you shortly."
                />
              </div>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
