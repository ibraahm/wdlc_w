import Link from 'next/link';
import { PageHero, Section } from '@/components/ui';
import { getCmsPage, getCmsNewsPosts, cmsMetadata, type NewsPostSummary } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('news');
  return cmsMetadata(page, {
    title: 'Newsroom | World Direct Link',
    description: 'Company news, community initiatives, and service updates from World Direct Link, Corp.',
  });
}

function fmtDate(value?: string) {
  return value
    ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
}

function FeaturedStory({ post }: { post: NewsPostSummary }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="group grid overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white transition-shadow hover:shadow-lg md:grid-cols-2"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0f1f3d] md:aspect-auto">
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full min-h-[220px] items-center justify-center bg-gradient-to-br from-[#13325f] to-[#0a1c3a] font-display text-2xl text-white/80">
            World Direct Link
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center p-7 md:p-9">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#b8860b]">Featured</span>
        <h2 className="mt-3 font-display text-2xl font-medium leading-tight text-primary-strong md:text-3xl">{post.title}</h2>
        <p className="mt-2 text-xs uppercase tracking-wide text-muted">
          {fmtDate(post.publishedAt)}{post.author ? ` · ${post.author}` : ''}
        </p>
        {post.summary && <p className="mt-4 text-[15px] leading-relaxed text-ink/75 line-clamp-3">{post.summary}</p>}
        <span className="mt-5 inline-flex items-center text-sm font-semibold text-[#13325f] group-hover:underline">
          Read the full story →
        </span>
      </div>
    </Link>
  );
}

function StoryCard({ post }: { post: NewsPostSummary }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[#e2e8f0] bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[#0f1f3d]">
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#13325f] to-[#0a1c3a] font-display text-white/70">
            WDL
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] uppercase tracking-wide text-muted">{fmtDate(post.publishedAt)}</p>
        <h3 className="mt-1.5 font-display text-lg font-medium leading-snug text-primary-strong">{post.title}</h3>
        {post.summary && <p className="mt-2 text-sm leading-relaxed text-ink/70 line-clamp-3">{post.summary}</p>}
        <span className="mt-4 inline-block text-sm font-semibold text-[#13325f] group-hover:underline">Read more →</span>
      </div>
    </Link>
  );
}

export default async function NewsroomPage() {
  const [cmsPage, posts] = await Promise.all([getCmsPage('news'), getCmsNewsPosts('NEWS')]);
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage!.blocks.length > 0
    ? cmsPage!.blocks as { type: string; data: Record<string, unknown> }[]
    : null;
  if (cmsBlocks) return <BlockRenderer blocks={cmsBlocks} />;

  const [featured, ...rest] = posts;

  return (
    <>
      <PageHero
        eyebrow="Newsroom"
        title="News & Updates"
        subtitle="Company news, community initiatives, and service updates from World Direct Link, Corp."
      />

      <Section>
        {posts.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-[#e2e8f0] bg-white px-6 py-16 text-center">
            <h2 className="font-display text-2xl text-primary-strong">More to come</h2>
            <p className="mt-2 text-muted">Company news and updates will be published here.</p>
            <Link href="/news/press" className="mt-5 inline-block text-sm font-semibold text-[#13325f] hover:underline">
              View press releases →
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            <FeaturedStory post={featured} />
            {rest.length > 0 && (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">More stories</span>
                  <span className="h-px flex-1 bg-[#e2e8f0]" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => <StoryCard key={post.id} post={post} />)}
                </div>
              </>
            )}
          </div>
        )}
      </Section>
    </>
  );
}
