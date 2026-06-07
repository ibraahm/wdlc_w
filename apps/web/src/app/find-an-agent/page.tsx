import { PageHero, Section, Callout, CtaBand, ButtonOnDark } from '@/components/ui';
import { getAgentLocations } from '@/lib/agents';
import AgentLocator from '@/components/AgentLocator';
import { PORTAL_URL } from '@/lib/site';

export const metadata = {
  title: 'Find an Agent | World Direct Link',
  description:
    'Locate an authorized World Direct Link agent near you. Search our network of active agent locations on the map or by city, state, or ZIP.',
};

export default async function FindAnAgentPage() {
  const agents = await getAgentLocations();

  return (
    <>
      <PageHero
        eyebrow="Agents & Partners"
        title="Find an Agent"
        subtitle="Locate an authorized World Direct Link agent near you. Search the map or browse the list of active locations."
      />

      <Section>
        {agents.length === 0 ? (
          <Callout variant="info">
            Agent locations are being added. Please check back soon, or contact us for the nearest
            authorized agent.
          </Callout>
        ) : (
          <AgentLocator agents={agents} />
        )}
      </Section>

      <CtaBand heading="Want to become an authorized agent?">
        <ButtonOnDark href="/agents/become-an-agent">Become an Agent</ButtonOnDark>
        <ButtonOnDark href={`${PORTAL_URL}/login`} external>
          Agent Training Portal
        </ButtonOnDark>
      </CtaBand>
    </>
  );
}
