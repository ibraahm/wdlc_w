import {
  PageHero,
  Section,
  Container,
  CtaBand,
  ButtonOnDark,
} from '@/components/ui';
import ContactForm from '@/components/ContactForm';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('services/track');
  return cmsMetadata(page, {
    title: 'Track Your Transfer | World Direct Link',
    description: 'Check the status of a transfer using your transaction ID, or contact us toll-free for help.',
  });
}

export default async function TrackPage() {
  const cmsPage = await getCmsPage('services/track');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero eyebrow="Services" title="Track Your Transfer" />

      <Section>
        <Container>
          <p className="max-w-3xl text-lg text-gray-700">
            Check the status of a transfer using your transaction ID. For help, contact the
            agent location where you sent your transfer or call us toll-free.
          </p>

          <div className="mt-10 max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-gray-900">Track a transfer</h2>
            <div className="mt-6">
              <ContactForm
                fields={[
                  { name: 'transactionId', label: 'Transaction ID', type: 'text', required: true },
                  {
                    name: 'senderRef',
                    label: 'Sender phone or last name',
                    type: 'text',
                    required: true,
                  },
                ]}
                submitLabel="Check Status" action="track_transfer"
                successMessage="Thanks — if your transaction is found, status details will be shown here. For immediate help, call 800-939-7185."
              />
            </div>
          </div>

          <p className="mt-6 max-w-xl text-sm text-gray-600">
            Don&apos;t have your transaction ID? Call {company.tollFree} with your sending date
            and recipient details.
          </p>
        </Container>
      </Section>

      <CtaBand heading="Need help?">
        <ButtonOnDark href="/support/contact">Contact Support</ButtonOnDark>
      </CtaBand>
        </>
      )}
    </>
  );
}
