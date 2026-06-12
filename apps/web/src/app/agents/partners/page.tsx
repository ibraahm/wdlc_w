import Link from 'next/link';
import { PageHero, Section, SectionHeading, CtaBand, ButtonOnDark } from '@/components/ui';
import { getCmsPage, cmsMetadata, getCmsPartners, type CmsPartner } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('agents/partners');
  return cmsMetadata(page, {
    title: 'Our Partners | World Direct Link',
    description:
      'World Direct Link works with established correspondent, banking, and technology partners to deliver funds reliably worldwide.',
  });
}

const TYPE_LABELS: Record<string, string> = {
  CORRESPONDENT: 'Correspondent',
  BANKING: 'Banking',
  TECHNOLOGY: 'Technology',
  OTHER: 'Partner',
};

const TYPE_COLORS: Record<string, string> = {
  CORRESPONDENT: 'bg-blue-100 text-blue-700',
  BANKING: 'bg-emerald-100 text-emerald-700',
  TECHNOLOGY: 'bg-violet-100 text-violet-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

function PartnerCard({ partner }: { partner: CmsPartner }) {
  const initials = partner.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="relative flex flex-col rounded-2xl border border-[#d9e0e8] bg-white p-6 hover:border-primary/40 hover:shadow-md transition-all duration-200">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary font-bold text-lg">
          {partner.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={partner.logoUrl} alt={partner.name} className="h-10 w-10 object-contain rounded" />
          ) : (
            initials
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {partner.featured && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Lead
            </span>
          )}
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[partner.type] ?? TYPE_COLORS.OTHER}`}>
            {TYPE_LABELS[partner.type] ?? partner.type}
          </span>
        </div>
      </div>

      <h3 className="font-bold text-gray-900 text-base mb-1">{partner.name}</h3>

      {partner.region && (
        <p className="text-xs font-medium text-primary/70 mb-3 flex items-center gap-1">
          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {partner.region}
        </p>
      )}

      {partner.description && (
        <p className="text-sm text-gray-500 leading-relaxed flex-1">{partner.description}</p>
      )}

      {partner.website && (
        <a
          href={partner.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Visit website
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  );
}

function PartnerGroup({ type, partners }: { type: string; partners: CmsPartner[] }) {
  if (partners.length === 0) return null;
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
        {TYPE_LABELS[type] ?? type} partners
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {partners.map((p) => <PartnerCard key={p.id} partner={p} />)}
      </div>
    </div>
  );
}

export default async function PartnersPage() {
  const cmsPage = await getCmsPage('agents/partners');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0
    ? cmsPage.blocks as { type: string; data: Record<string, unknown> }[]
    : null;

  if (cmsBlocks) return <BlockRenderer blocks={cmsBlocks} />;

  const partners = await getCmsPartners();
  const featured = partners.filter((p) => p.featured);
  const rest = partners.filter((p) => !p.featured);
  const byType: Record<string, CmsPartner[]> = {};
  for (const t of ['CORRESPONDENT', 'BANKING', 'TECHNOLOGY', 'OTHER']) {
    byType[t] = rest.filter((p) => p.type === t);
  }
  const hasGroups = rest.length > 0;

  return (
    <>
      <PageHero
        eyebrow="Agents & Partners"
        title="Our Partners"
        subtitle="World Direct Link works with leading correspondents, banks, and technology providers to deliver funds reliably across the globe."
      >
        <ButtonOnDark href="/agents/become-an-agent">Become an Agent</ButtonOnDark>
      </PageHero>

      <Section>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl">
          Every partner in the World Direct Link network is subject to thorough due diligence,
          annual compliance reviews, and ongoing risk-based monitoring — ensuring every transfer
          reaches its destination safely, even in regions where traditional banking is limited.
        </p>
      </Section>

      {featured.length > 0 && (
        <Section muted>
          <SectionHeading title="Lead correspondent" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl">
            {featured.map((p) => <PartnerCard key={p.id} partner={p} />)}
          </div>
        </Section>
      )}

      {hasGroups && (
        <Section>
          <SectionHeading title="Partner network" />
          <div className="space-y-12">
            {['CORRESPONDENT', 'BANKING', 'TECHNOLOGY', 'OTHER'].map((t) => (
              <PartnerGroup key={t} type={t} partners={byType[t]} />
            ))}
          </div>
        </Section>
      )}

      {partners.length === 0 && (
        <Section>
          <div className="max-w-2xl">
            <SectionHeading title="Correspondent network" />
            <p className="text-lg text-gray-700 leading-relaxed">
              World Direct Link works with a vetted network of correspondents, banks, and
              technology providers. Every partner undergoes annual due diligence and ongoing
              risk-based monitoring before and throughout the relationship.
            </p>
          </div>
        </Section>
      )}

      <CtaBand heading="Interested in partnering with World Direct Link?">
        <ButtonOnDark href="/support/contact">Contact Us</ButtonOnDark>
        <Link
          href="/agents/become-an-agent"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
        >
          Become an Agent
        </Link>
      </CtaBand>
    </>
  );
}
