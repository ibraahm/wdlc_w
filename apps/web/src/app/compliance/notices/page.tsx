import { PageHero, Section, SectionHeading, Checklist, CtaBand, ButtonOnDark } from '@/components/ui';
import { PORTAL_URL } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('compliance/notices');
  return cmsMetadata(page, {
    title: 'Agent Regulatory Notices | World Direct Link',
    description: 'Regulatory notices, posting requirements, and compliance updates for authorized World Direct Link agents.',
  });
}

export default async function NoticesPage() {
  const cmsPage = await getCmsPage('compliance/notices');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero
        eyebrow="Compliance"
        title="Agent Regulatory Notices"
        subtitle="Posting requirements and updates for authorized World Direct Link agents."
      />

      <Section>
        <SectionHeading title="Notice examples" subtitle="Full documents are available in the Agent Training Portal." />
        <div className="max-w-2xl">
          <Checklist
            items={[
              'Required consumer notice and Agent Certificate posting guidance',
              'State-specific recordkeeping and reporting notices (e.g., Arizona thresholds)',
              'Pre-payment disclosure requirements (Dodd-Frank §1073 / EFTA)',
              'Updates to OFAC screening and reporting procedures',
              'Annual training and independent review reminders',
            ]}
          />
        </div>
      </Section>

      <CtaBand heading="Agents: log in to the Agent Training Portal for full documents">
        <ButtonOnDark href={`${PORTAL_URL}/login`} external>Agent Training Portal</ButtonOnDark>
      </CtaBand>
        </>
      )}
    </>
  );
}
