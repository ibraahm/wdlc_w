import {
  Section,
  PageHero,
  SectionHeading,
  StatStrip,
  Checklist,
  Steps,
  ButtonOnDark,
} from '@/components/ui';
import AgentApplicationForm from '@/components/AgentApplicationForm';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('agents/become-an-agent');
  return cmsMetadata(page, {
    title: 'Become a WDL Agent | World Direct Link',
    description: 'Partner with World Direct Link to offer money transfer services. Earn commissions, serve your community, and get full compliance support and training.',
  });
}

export default async function BecomeAnAgentPage() {
  const cmsPage = await getCmsPage('agents/become-an-agent');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero
        eyebrow="Agents & Partners"
        title="Become a WDL Agent"
        subtitle="Grow with a trusted principal."
      >
        <ButtonOnDark href="#apply">Start Your Application</ButtonOnDark>
      </PageHero>

      <Section>
        <StatStrip
          stats={[
            { value: 'Earn commissions', label: 'Add a new revenue stream to your existing business.' },
            { value: 'Serve your community', label: 'Help neighbors send money home with confidence.' },
            {
              value: 'Full compliance support & training',
              label: 'We guide you through BSA/AML obligations every step of the way.',
            },
          ]}
        />
        <p className="mt-10 text-lg text-gray-700 leading-relaxed max-w-3xl">
          Partner with World Direct Link to offer money transfer services in your community. We provide
          the platform, training, and compliance support you need to operate confidently as an
          authorized agent.
        </p>
      </Section>

      <Section muted>
        <SectionHeading title="What we look for" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          <Checklist
            items={[
              'A physical business or commercial location',
              'Commitment to our BSA/AML compliance program',
            ]}
          />
          <Checklist items={['Successful background and OFAC screening']} />
        </div>
      </Section>

      <Section>
        <SectionHeading title="Application requirements" />
        <Steps
          items={[
            { title: 'Completed and signed Agent Application' },
            { title: 'Signed credit and background check authorization' },
            {
              title:
                "Business license / occupancy permit, or property-use documentation (lease, ownership, or alternate proof such as a current utility bill or insurance in the agent's or business's name)",
            },
            { title: 'Copy of a current driver\'s license or valid government-issued photo ID' },
          ]}
        />
      </Section>

      <Section muted>
        <SectionHeading title="How it works" />
        <Steps
          items={[
            { title: 'Apply', body: 'Submit your Agent Application and required documents.' },
            {
              title: 'Screening',
              body: 'We complete background and OFAC screening on the business and principals.',
            },
            {
              title: 'Risk assessment',
              body: 'Our compliance team evaluates the location, business type, and risk profile.',
            },
            { title: 'Training', body: 'Complete BSA/AML and operational training before launch.' },
            { title: 'System setup', body: 'We provision your access and configure your location.' },
            { title: 'Go live', body: 'Begin serving customers as an authorized WDL agent.' },
          ]}
        />
      </Section>

      <Section>
        <div id="apply">
          <SectionHeading
            title="Agent application"
            subtitle="Tell us about your business and our onboarding team will follow up."
          />
          <div className="max-w-2xl">
            <AgentApplicationForm />
          </div>
        </div>
      </Section>
        </>
      )}
    </>
  );
}
