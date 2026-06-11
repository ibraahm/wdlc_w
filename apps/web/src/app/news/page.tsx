import Link from 'next/link';
import { PageHero, Section, SectionHeading } from '@/components/ui';
import { getCmsPage, getCmsNewsPosts, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('news');
  return cmsMetadata(page, {
    title: 'Newsroom | World Direct Link',
    description: 'Stay up to date on World Direct Link news, community initiatives, and service updates.',
  });
}

export default async function NewsroomPage() {
  const [cmsPage, posts] = await Promise.all([getCmsPage('news'), getCmsNewsPosts('NEWS')]);
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage!.blocks.length > 0
    ? cmsPage!.blocks as { type: string; data: Record<string, unknown> }[]
    : null;

  if (cmsBlocks) return <BlockRenderer blocks={cmsBlocks} />;

  return (
    <>
      <PageHero
        eyebrow="News & Support"
        title="Newsroom"
        subtitle="Stay up to date on World Direct Link news, community initiatives, and service updates."
      />

      <Section>
        {posts.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#f5f7fa] border border-[#d9e0e8] flex items-center justify-center mx-auto mb-4 text-2xl">
              📰
            </div>
            <h2 className="text-xl font-bold text-primary-strong">Check back soon</h2>
            <p className="mt-2 text-muted">
              Latest World Direct Link updates and community news will appear here.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl space-y-6">
            <SectionHeading>Latest News</SectionHeading>
            <div className="grid gap-6 md:grid-cols-2">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/news/${post.slug}`}
                  className="block border border-[#d9e0e8] rounded-xl p-5 bg-white hover:shadow-md transition-shadow"
                >
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt={post.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                  )}
                  <p className="text-xs text-muted mb-1">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : ''}
                    {post.author ? ` · ${post.author}` : ''}
                  </p>
                  <h3 className="font-bold text-primary-strong text-lg leading-snug">{post.title}</h3>
                  {post.summary && <p className="mt-2 text-sm text-muted line-clamp-3">{post.summary}</p>}
                  <span className="mt-3 inline-block text-sm text-[#1a3c6e] font-medium">Read more →</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
