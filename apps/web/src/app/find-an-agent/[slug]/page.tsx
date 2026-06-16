import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  PageHero,
  Section,
  Breadcrumb,
  FactTable,
  Checklist,
  Callout,
  ButtonPrimary,
  ButtonSecondary,
} from '@/components/ui';
import { company, PORTAL_URL } from '@/lib/site';
import { getAgentLocations, getAgentLocationBySlug, locationSlug, type AgentLocation } from '@/lib/agents';
import {
  SITE_URL,
  MONEY_SERVICES,
  FEATURED_CORRIDORS,
  locationDisplayName,
  fullAddress,
  locationJsonLd,
  jsonLdScript,
} from '@/lib/locations-seo';

// New locations appear without a redeploy; pages are revalidated periodically.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const locations = await getAgentLocations();
  return locations.map((loc) => ({ slug: locationSlug(loc) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loc = await getAgentLocationBySlug(slug);
  if (!loc) return { title: 'Location not found | World Direct Link' };

  const place = [loc.city, loc.state].filter(Boolean).join(', ');
  const title = `${locationDisplayName(loc)} | World Direct Link, Corp. Money Transfer`;
  const description =
    `Send money to Somalia, Ethiopia, Africa and the Middle East from ${place || 'this location'}. ` +
    `World Direct Link, Corp. authorized money-transmission agent — international money transfer, ` +
    `remittance, cash pickup, bank deposit and mobile wallet payout.`;
  const url = `${SITE_URL}/find-an-agent/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

function mapsLinks(loc: AgentLocation) {
  const q = encodeURIComponent(`${loc.businessName ?? 'World Direct Link'} ${fullAddress(loc)}`);
  const ll = `${loc.latitude},${loc.longitude}`;
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
    apple: `https://maps.apple.com/?q=${q}&ll=${ll}`,
    bing: `https://www.bing.com/maps?q=${q}&cp=${loc.latitude}~${loc.longitude}&lvl=15`,
  };
}

export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loc = await getAgentLocationBySlug(slug);
  if (!loc) notFound();

  const place = [loc.city, loc.state].filter(Boolean).join(', ');
  const url = `${SITE_URL}/find-an-agent/${slug}`;
  const links = mapsLinks(loc);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(locationJsonLd(loc, url)) }}
      />

      <PageHero
        eyebrow="World Direct Link, Corp. — Authorized Money Transmission Location"
        title={loc.businessName ?? `World Direct Link Agent — ${place}`}
        subtitle={`Send money to Somalia, Ethiopia, across Africa and the Middle East from ${place || 'this location'}.`}
      />

      <Section>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Find an Agent', href: '/find-an-agent' },
            { label: locationDisplayName(loc) },
          ]}
        />

        <p>
          This is an authorized <strong>{company.legalName}</strong> agent location offering licensed
          money-transmission services{place ? ` in ${place}` : ''}. Visit us to send money to Somalia,
          Ethiopia, the Horn of Africa, all of Africa and the Middle East — with cash pickup, bank
          deposit and mobile wallet payout options.
        </p>

        <FactTable
          rows={[
            { label: 'Location', value: locationDisplayName(loc) },
            { label: 'Address', value: fullAddress(loc) || '—' },
            {
              label: 'Phone',
              value: loc.publicPhone ? (
                <a href={`tel:${loc.publicPhone}`}>{loc.publicPhone}</a>
              ) : (
                <a href={`tel:${company.tollFree}`}>{company.tollFree} (toll-free)</a>
              ),
            },
            { label: 'Operated by', value: `${company.legalName} · NMLS ID ${company.nmls}` },
          ]}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <ButtonPrimary href={links.google} external>Directions (Google Maps)</ButtonPrimary>
          <ButtonSecondary href={links.apple} external>Apple Maps</ButtonSecondary>
          <ButtonSecondary href={links.bing} external>Bing Maps</ButtonSecondary>
        </div>
      </Section>

      <Section>
        <h2>Services at this location</h2>
        <Checklist items={MONEY_SERVICES.map((s) => s)} />

        <h2 style={{ marginTop: '2rem' }}>Popular money transfer destinations</h2>
        <p>
          Customers near {place || 'this location'} use {company.shortName} to send money to:
        </p>
        <Checklist items={FEATURED_CORRIDORS.map((c) => `Send money to ${c}`)} />
        <p>…and to the rest of Africa and the Middle East.</p>
      </Section>

      <Section>
        <Callout variant="info">
          {company.legalName} is licensed as a money transmitter and is a FinCEN-registered Money
          Services Business (NMLS ID {company.nmls}). Money transmission is offered only where the
          company holds an active license. Verify license status at nmlsconsumeraccess.org. For help
          with a transaction, call {company.tollFree}.
        </Callout>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <ButtonSecondary href="/find-an-agent">← All locations</ButtonSecondary>
          <ButtonSecondary href={`${PORTAL_URL}/login`} external>Agent Portal</ButtonSecondary>
        </div>
      </Section>
    </>
  );
}
