import Link from 'next/link';
import { PageHero, Section, Callout, CtaBand, ButtonOnDark } from '@/components/ui';
import { getAgentLocations, locationSlug } from '@/lib/agents';
import AgentLocator from '@/components/AgentLocator';
import { PORTAL_URL } from '@/lib/site';
import { SITE_URL, locationDisplayName, fullAddress, networkJsonLd, jsonLdScript } from '@/lib/locations-seo';

export const metadata = {
  title: 'Find a World Direct Link Money Transfer Location | Send Money to Somalia, Ethiopia & Africa',
  description:
    'Find a World Direct Link, Corp. authorized money-transmission agent near you. Send money to Somalia, Ethiopia, across Africa and the Middle East — cash pickup, bank deposit and mobile wallet payout.',
};

export default async function FindAnAgentPage() {
  const agents = await getAgentLocations();

  return (
    <>
      {agents.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(networkJsonLd(agents, `${SITE_URL}/find-an-agent`)),
          }}
        />
      )}

      <PageHero
        eyebrow="World Direct Link, Corp. — Money Transmission Locations"
        title="Find an Agent"
        subtitle="Locate an authorized World Direct Link money-transmission location to send money to Somalia, Ethiopia, across Africa and the Middle East. Search the map or browse the network list."
      />

      <Section>
        {agents.length === 0 ? (
          <Callout variant="info">
            Agent locations are being added. Please check back soon, or contact us for the nearest
            authorized delegate.
          </Callout>
        ) : (
          <AgentLocator agents={agents} />
        )}
      </Section>

      {agents.length > 0 && (
        <Section>
          <h2>All money transmission locations</h2>
          <p>Browse every authorized {`World Direct Link, Corp.`} location and view directions, hours and services:</p>
          <ul className="location-index">
            {agents.map((a) => (
              <li key={a.id}>
                <Link href={`/find-an-agent/${locationSlug(a)}`}>{locationDisplayName(a)}</Link>
                {fullAddress(a) ? <span> — {fullAddress(a)}</span> : null}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <CtaBand heading="Want to join our authorized delegate network?">
        <ButtonOnDark href="/agents/become-an-agent">Become an Agent</ButtonOnDark>
        <ButtonOnDark href={`${PORTAL_URL}/login`} external>
          Agent Training Portal
        </ButtonOnDark>
      </CtaBand>
    </>
  );
}
