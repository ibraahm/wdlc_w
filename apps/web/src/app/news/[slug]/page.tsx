import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Section } from '@/components/ui';
import { company } from '@/lib/site';
import { getCmsNewsPost } from '@/lib/cms';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getCmsNewsPost(params.slug);
  if (!post) return { title: 'Not Found | World Direct Link' };
  return {
    title: `${post.title} | World Direct Link`,
    description: post.summary,
    openGraph: post.imageUrl ? { images: [post.imageUrl] } : undefined,
  };
}

function fmtDate(value?: string) {
  return value
    ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
}

export default async function NewsPostPage({ params }: { params: { slug: string } }) {
  const post = await getCmsNewsPost(params.slug);
  if (!post) notFound();

  const isPress = post.category === 'PRESS';
  const backHref = isPress ? '/news/press' : '/news';
  const backLabel = isPress ? 'Press Releases' : 'Newsroom';

  return (
    <article>
      {/* Editorial header */}
      <header className="border-b border-[#e2e8f0] bg-[#f8fafc]">
        <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
          <Link href={backHref} className="text-sm font-semibold text-[#13325f] hover:underline">
            ← {backLabel}
          </Link>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b8860b]">
            {isPress ? 'Press Release' : 'News'}
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight text-primary-strong md:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 text-sm text-muted">
            {fmtDate(post.publishedAt)}{post.author ? ` · ${post.author}` : ''}
          </p>
          {post.summary && (
            <p className="mt-5 border-l-2 border-[#b8860b] pl-4 font-display text-lg italic leading-relaxed text-ink/80">
              {post.summary}
            </p>
          )}
        </div>
      </header>

      <Section>
        <div className="mx-auto max-w-3xl">
          {post.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.imageUrl} alt={post.title} className="mb-10 max-h-[420px] w-full rounded-2xl object-cover" />
          )}

          {post.body ? (
            <div
              className="article-body"
              dangerouslySetInnerHTML={{ __html: post.body }}
            />
          ) : (
            <p className="italic text-muted">No content available.</p>
          )}

          {/* Footer */}
          <div className="mt-12 border-t border-[#e2e8f0] pt-6">
            {isPress && (
              <p className="mb-4 text-sm text-ink/70">
                Media inquiries:{' '}
                <a href={`mailto:${company.email}`} className="font-semibold text-[#13325f] underline">{company.email}</a>
              </p>
            )}
            <Link href={backHref} className="text-sm font-semibold text-[#13325f] hover:underline">
              ← Back to {backLabel}
            </Link>
          </div>
        </div>
      </Section>
    </article>
  );
}
