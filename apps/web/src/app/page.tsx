import { getCmsPage, cmsMetadata } from '@/lib/cms';
import BlockRenderer from '@/components/BlockRenderer';
import { defaultHomeBlocks } from '@/lib/homeBlocks';

export async function generateMetadata() {
  const page = await getCmsPage('home');
  return cmsMetadata(page, {
    title: 'World Direct Link | Licensed Money Transmitter Since 1999',
    description: 'Fast, affordable, and reliable money transfers for immigrant, refugee, and diaspora families. Serving communities since 1999.',
  });
}

function hasContent(blocks: unknown): boolean {
  if (Array.isArray(blocks)) return blocks.length > 0;
  if (blocks && typeof blocks === 'object' && 'content' in blocks) {
    return Array.isArray((blocks as { content: unknown[] }).content)
      && (blocks as { content: unknown[] }).content.length > 0;
  }
  return false;
}

export default async function HomePage() {
  const cmsPage = await getCmsPage('home');
  const blocks = hasContent(cmsPage?.blocks) ? cmsPage!.blocks : defaultHomeBlocks;
  return <BlockRenderer blocks={blocks} />;
}
