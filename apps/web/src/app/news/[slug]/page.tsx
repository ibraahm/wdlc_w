import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageHero, Section } from '@/components/ui';
import { getCmsNewsPost } from '@/lib/cms';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getCmsNewsPost(params.slug);
  if (!post) return { title: 'Not Found | World Direct Link' };
  return {
    title: `${post.title} | World Direct Link`,
    description: post.summary,
  };
}

export default async function NewsPostPage({ params }: { params: { slug: string } }) {
  const post = await getCmsNewsPost(params.slug);
  if (!post) notFound();

  const backHref = post.category === 'PRESS' ? '/news/press' : '/news';
  const backLabel = post.category === 'PRESS' ? 'Press Releases' : 'Newsroom';

  return (
    <>
      <PageHero
        eyebrow={post.category === 'PRESS' ? 'Press Release' : 'News'}
        title={post.title}
        subtitle={post.summary}
      />

      <Section>
        <div className="max-w-3xl">
          <div className="mb-6 flex items-center gap-3 text-sm text-muted">
            <Link href={backHref} className="text-[#1a3c6e] hover:underline">← {backLabel}</Link>
            {post.publishedAt && (
              <span>
                {new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
            {post.author && <span>· {post.author}</span>}
          </div>

          {post.imageUrl && (
            <img src={post.imageUrl} alt={post.title} className="w-full rounded-xl mb-8 object-cover max-h-80" />
          )}

          {post.body ? (
            <div
              className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.body }}
            />
          ) : (
            <p className="text-muted italic">No content available.</p>
          )}
        </div>
      </Section>
    </>
  );
}
