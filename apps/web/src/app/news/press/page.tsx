import Link from 'next/link';
import { PageHero, Section } from '@/components/ui';
import { company } from '@/lib/site';
import { getCmsPage, getCmsNewsPosts, cmsMetadata, type NewsPostSummary } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';

export async function generateMetadata() {
  const page = await getCmsPage('news/press');
  return cmsMetadata(page, {
    title: 'Press Releases | World Direct Link',
    description: 'Official announcements and press releases from World Direct Link, Corp.',
  });
}

function fmtDate(value?: string) {
  return value
    ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Undated';
}

function groupByYear(posts: NewsPostSummary[]) {
  const groups = new Map<string, NewsPostSummary[]>();
  for (const p of posts) {
    const year = p.publishedAt ? new Date(p.publishedAt).getFullYear().toString() : 'Earlier';
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(p);
  }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export default async function PressPage() {
  const [cmsPage, posts] = await Promise.all([getCmsPage('news/press'), getCmsNewsPosts('PRESS')]);
  const cmsBlocks = Array.isArray(cmsPage?.blocks) && cmsPage!.blocks.length > 0
    ? cmsPage!.blocks as { type: string; data: Record<string, unknown> }[]
    : null;
  if (cmsBlocks) return <BlockRenderer blocks={cmsBlocks} />;

  const years = groupByYear(posts);

  return (
    <>
      <PageHero
        eyebrow="Press"
        title="Press Releases"
        subtitle="Official announcements from World Direct Link, Corp."
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-[#e2e8f0] bg-white px-6 py-16 text-center">
              <h2 className="font-display text-2xl text-primary-strong">No releases yet</h2>
              <p className="mt-2 text-muted">Official announcements will be posted here.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {years.map(([year, items]) => (
                <div key={year}>
                  <div className="mb-4 flex items-center gap-4">
                    <span className="font-display text-xl text-primary-strong">{year}</span>
                    <span className="h-px flex-1 bg-[#e2e8f0]" />
                  </div>
                  <ul className="divide-y divide-[#eef2f6] border-y border-[#eef2f6]">
                    {items.map((post) => (
                      <li key={post.id}>
                        <Link
                          href={`/news/${post.slug}`}
                          className="group flex flex-col gap-1 py-5 transition-colors hover:bg-[#f8fafc] sm:flex-row sm:items-baseline sm:gap-6"
                        >
                          <time className="shrink-0 text-xs uppercase tracking-wide text-muted sm:w-32 sm:pt-0.5">
                            {fmtDate(post.publishedAt)}
                          </time>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-display text-lg font-medium leading-snug text-primary-strong group-hover:text-[#13325f]">
                              {post.title}
                            </h3>
                            {post.summary && <p className="mt-1 text-sm leading-relaxed text-ink/70 line-clamp-2">{post.summary}</p>}
                          </div>
                          <span className="hidden shrink-0 self-center text-sm font-semibold text-[#13325f] group-hover:underline sm:inline">
                            Read →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 rounded-xl border border-[#e6d9b0] bg-[#fcf8ec] px-6 py-5">
            <p className="text-sm font-semibold text-primary-strong">Media inquiries</p>
            <p className="mt-1 text-sm text-ink/75">
              For interviews, statements, or media assets, contact{' '}
              <a href={`mailto:${company.email}`} className="font-semibold text-[#13325f] underline">{company.email}</a>.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
