import Link from 'next/link';
import { PageHero, Section, Callout, SectionHeading } from '@/components/ui';
import { company } from '@/lib/site';
import { getCmsPage, getCmsNewsPosts, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('news/press');
  return cmsMetadata(page, {
    title: 'Press Releases | World Direct Link',
    description: 'Official announcements from World Direct Link, Corp.',
  });
}

export default async function PressPage() {
  const [cmsPage, posts] = await Promise.all([getCmsPage('news/press'), getCmsNewsPosts('PRESS')]);
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage!.blocks.length > 0
    ? cmsPage!.blocks as { type: string; data: Record<string, unknown> }[]
    : null;

  if (cmsBlocks) return <BlockRenderer blocks={cmsBlocks} />;

  return (
    <>
      <PageHero
        eyebrow="News & Support"
        title="Press Releases"
        subtitle="Official announcements from World Direct Link, Corp."
      />

      <Section>
        <div className="max-w-3xl space-y-6">
          {posts.length === 0 ? (
            <div className="border border-[#d9e0e8] rounded-xl p-6 bg-white text-center text-muted">
              No press releases are currently posted. Check back soon.
            </div>
          ) : (
            <>
              <SectionHeading>Press Releases</SectionHeading>
              <div className="space-y-4">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/news/${post.slug}`}
                    className="flex items-start gap-4 border border-[#d9e0e8] rounded-xl p-5 bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted mb-1">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                          : 'Undated'}
                      </p>
                      <h3 className="font-bold text-primary-strong text-base leading-snug">{post.title}</h3>
                      {post.summary && <p className="mt-1 text-sm text-muted line-clamp-2">{post.summary}</p>}
                    </div>
                    <span className="shrink-0 text-sm text-[#1a3c6e] font-medium self-center">Read →</span>
                  </Link>
                ))}
              </div>
            </>
          )}
          <Callout variant="gold">
            Media inquiries:{' '}
            <a href={`mailto:${company.email}`} className="underline">{company.email}</a>
          </Callout>
        </div>
      </Section>
    </>
  );
}
