import Link from 'next/link';
import { PageHero, Section, SectionHeading } from '@/components/ui';
import ContactForm, { type Field } from '@/components/ContactForm';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('about/contact');
  return cmsMetadata(page, {
    title: 'Contact Us | World Direct Link',
    description: 'Contact World Direct Link corporate headquarters in Stone Mountain, Georgia, or send us a message.',
  });
}

const fields: Field[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel', optional: true },
  {
    name: 'topic',
    label: 'Topic',
    type: 'select',
    required: true,
    options: ['General', 'Agent inquiry', 'Compliance', 'Claims'],
  },
  { name: 'message', label: 'Message', type: 'textarea', required: true },
];

export default async function ContactPage() {
  const cmsPage = await getCmsPage('about/contact');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero
        eyebrow="About Us"
        title="Contact Us"
        subtitle="We're here to help — reach our headquarters or send us a message."
      />

      <Section>
        <div className="grid lg:grid-cols-2 gap-12">
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

            <div className="mt-8 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-16 px-4 text-center text-gray-400">
              [ Map: {company.address.line1}, {company.address.city}, {company.address.state}{' '}
              {company.address.zip} ]
            </div>

            <p className="mt-6 text-sm text-gray-600">
              For transaction problems or refunds, see{' '}
              <Link href="/support/complaint" className="text-primary hover:underline">
                Help Center → Complaint Form
              </Link>
              .
            </p>
          </div>

          <div>
            <SectionHeading title="Send us a message" />
            <ContactForm fields={fields} submitLabel="Send Message" action="contact_us" />
          </div>
        </div>
      </Section>
        </>
      )}
    </>
  );
}
