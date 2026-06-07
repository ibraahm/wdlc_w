import { PageHero, Section, Callout } from '@/components/ui';
import { company } from '@/lib/site';
import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('news/press');
  return cmsMetadata(page, {
    title: 'Press Releases | World Direct Link',
    description: 'Official announcements from World Direct Link, Corp.',
  });
}

export default async function PressPage() {
  const cmsPage = await getCmsPage('news/press');
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage.blocks.length > 0 ? cmsPage.blocks as {type:string;data:Record<string,unknown>}[] : null;
  return (
    <>
      {cmsBlocks ? <BlockRenderer blocks={cmsBlocks} /> : (
        <>
      <PageHero
        eyebrow="News & Support"
        title="Press Releases"
        subtitle="Official announcements from World Direct Link, Corp."
      />

      <Section>
        <div className="max-w-2xl space-y-6">
          <div className="border border-[#d9e0e8] rounded-xl p-6 bg-white text-center text-muted">
            No press releases are currently posted. Check back soon.
          </div>
          <Callout variant="gold">
            Media inquiries:{' '}
            <a href={`mailto:${company.email}`} className="underline">{company.email}</a>
          </Callout>
        </div>
      </Section>
        </>
      )}
    </>
  );
}
