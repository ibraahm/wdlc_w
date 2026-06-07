import { PageHero, Section, SectionHeading, Checklist, CtaBand, ButtonOnDark } from '@/components/ui';
import { PORTAL_URL } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';

export async function generateMetadata() {
  const page = await getCmsPage('compliance/notices');
  return cmsMetadata(page, {
    title: 'Agent Regulatory Notices | World Direct Link',
    description: 'Regulatory notices, posting requirements, and compliance updates for authorized WDL agents.',
  });
}

export default function NoticesPage() {
  return (
    <>
      <PageHero
        eyebrow="Compliance"
        title="Agent Regulatory Notices"
        subtitle="Posting requirements and updates for authorized WDL agents."
      />

      <Section>
        <SectionHeading title="Notice examples" subtitle="Full documents are available in the Agent Portal." />
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

      <CtaBand heading="Agents: log in to the Agent Portal for full documents">
        <ButtonOnDark href={`${PORTAL_URL}/login`} external>Agent Portal</ButtonOnDark>
      </CtaBand>
    </>
  );
}
