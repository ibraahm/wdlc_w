import { Section, PageHero, SectionHeading, Card, Callout, ButtonPrimary } from '@/components/ui';
import { company, PORTAL_URL } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('agents/resources');
  return cmsMetadata(page, {
    title: 'Agent Resources | World Direct Link',
    description: 'Tools and documents authorized World Direct Link agents need to stay compliant and serve customers well.',
  });
}

export default async function AgentResourcesPage() {
  const cmsPage = await getCmsPage('agents/resources');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero eyebrow="Agents & Partners" title="Agent Resources" />

      <Section>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl">
          Authorized agents can access the tools and documents needed to stay compliant and serve
          customers well.
        </p>
      </Section>

      <Section muted>
        <div className="rounded-xl border border-gray-200 bg-white p-8 max-w-3xl">
          <h2 className="text-xl font-semibold text-gray-900">Authenticated resources</h2>
          <p className="mt-2 text-gray-600 leading-relaxed">
            Compliance documents, training materials, and operational forms require an active agent
            account. Sign in to the Agent Training Portal to access your authenticated resources.
          </p>
          <div className="mt-6">
            <ButtonPrimary href={`${PORTAL_URL}/login`} external>
              Agent Training Portal
            </ButtonPrimary>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading title="What you'll find" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card title="BSA/AML Agent Compliance Program & acknowledgement forms" />
          <Card title="Training materials and annual refresher quiz" />
          <Card title="SAR Referral Form (English / Soomaali)" />
          <Card title="Recordkeeping and ID requirements quick guide" />
          <Card title="Consumer notice and signage (Agent Certificate)" />
          <Card title="Pre-payment disclosure guidance" />
          <Card title="Returned check reporting">
            Report returned checks to{' '}
            <a href={`mailto:${company.emails.returns}`} className="text-primary hover:underline">
              {company.emails.returns}
            </a>
            .
          </Card>
        </div>
      </Section>

      <Section muted>
        <Callout variant="info">
          Compliance questions?{' '}
          <a href={`mailto:${company.emails.compliance}`} className="font-medium hover:underline">
            {company.emails.compliance}
          </a>
        </Callout>
      </Section>
        </>
      )}
    </>
  );
}
