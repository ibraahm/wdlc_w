import { Section, PageHero, ButtonOnDark } from '@/components/ui';
import AgentApplicationForm from '@/components/AgentApplicationForm';
import { getCmsPage, cmsMetadata, getCmsForm, getCmsSetting } from '@/lib/cms';
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

  const cmsForm = await getCmsForm('agent-application');
  const optionsFor = (name: string) => cmsForm?.fields.find((f) => f.name === name)?.options;
  const draftTimeoutMinutes = await getCmsSetting<number>('application.draftTimeoutMinutes', 30);

  if (cmsBlocks) return <BlockRenderer blocks={cmsBlocks} />;

  return (
    <>
      <PageHero
        eyebrow="Agents & Partners"
        title="Become a WDL Agent"
        subtitle="Partner with a licensed money transmitter. Earn commissions and serve your community."
      >
        <ButtonOnDark href="#apply">Start Your Application</ButtonOnDark>
      </PageHero>

      <Section>
        <div className="grid lg:grid-cols-5 gap-10 items-start">

          {/* Form — left, larger column */}
          <div className="lg:col-span-3" id="apply">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Agent Application</h2>
            <p className="text-sm text-gray-500 mb-6">
              Takes about 5 minutes. Our onboarding team will follow up within 2 business days.
            </p>
            <AgentApplicationForm
              draftTimeoutMinutes={draftTimeoutMinutes}
              businessTypeOptions={optionsFor('businessType')}
              productOptions={optionsFor('productsOffered')}
              howFoundOptions={optionsFor('howFound')}
            />
          </div>

          {/* Benefits sidebar — right */}
          <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-8">
            <div className="rounded-xl border border-[#d9e0e8] bg-white p-6 space-y-4">
              <h3 className="font-bold text-gray-900">Why partner with WDL?</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                {[
                  { icon: '💰', text: 'Earn commissions on every transfer — no upfront fees' },
                  { icon: '🏘️', text: 'Serve your community with a trusted brand since 1999' },
                  { icon: '🎓', text: 'Full BSA/AML training and compliance support included' },
                  { icon: '⚙️', text: 'Simple system — no complex hardware required' },
                  { icon: '📞', text: 'Dedicated onboarding team and ongoing support' },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex gap-3">
                    <span className="shrink-0">{icon}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#d9e0e8] bg-white p-6 space-y-3">
              <h3 className="font-bold text-gray-900">What you'll need</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  'A physical business or commercial location',
                  'Valid government-issued photo ID',
                  'Business license (if applicable)',
                  'Willingness to complete a background check',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-green-500 font-bold shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-[#1a3c6e] text-white p-6 space-y-3">
              <h3 className="font-bold">How it works</h3>
              <ol className="space-y-2 text-sm text-white/85">
                {['Submit your application', 'Background & OFAC screening', 'Compliance training', 'System setup & go live'].map((step, i) => (
                  <li key={step} className="flex gap-2">
                    <span className="shrink-0 font-semibold text-white/60">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

        </div>
      </Section>
    </>
  );
}
