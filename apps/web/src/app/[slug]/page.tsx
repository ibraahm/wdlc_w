import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPage, getPages } from '@/lib/api';
import BlockRenderer from '@/components/BlockRenderer';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const pages = await getPages();
  return pages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getPage(params.slug);
  if (!page) return {};

  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? page.description,
  };
}

export default async function CmsPage({ params }: PageProps) {
  const page = await getPage(params.slug);

  if (!page) {
    notFound();
  }

  return <BlockRenderer blocks={page.blocks} />;
}
