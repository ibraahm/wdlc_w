import { PageHero, Section } from '@/components/ui';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('agents/partners');
  return cmsMetadata(page, {
    title: 'Partners | World Direct Link',
    description: 'World Direct Link partners — coming soon.',
  });
}

export default async function PartnersPage() {
  // If this page is ever built out in the CMS, render that instead.
  const cmsPage = await getCmsPage('agents/partners');
  const cmsBlocks =
    Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0
      ? (cmsPage.blocks as { type: string; data: Record<string, unknown> }[])
      : null;
  if (cmsBlocks) return <BlockRenderer blocks={cmsBlocks} />;

  return (
    <>
      <PageHero eyebrow="Agents & Partners" title="Partners" subtitle="Coming soon." />
      <Section>
        <div className="max-w-2xl text-center mx-auto py-12">
          <p className="text-lg text-gray-600">
            This page is coming soon. Please check back later.
          </p>
        </div>
      </Section>
    </>
  );
}
