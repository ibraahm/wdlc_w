const API = process.env.API_URL || 'http://localhost:4000/api';

export type CmsPage = {
  slug: string;
  title: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  blocks: unknown[];
  status: string;
};

// Fetch a published page from the CMS. Returns null if not found or backend unavailable.
export async function getCmsPage(slug: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/cms/pages/published/${slug}`, {
      next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Build Next.js Metadata from a CMS page, with static fallbacks.
export function cmsMetadata(
  page: CmsPage | null,
  fallback: { title: string; description?: string },
) {
  return {
    title: page?.seoTitle ?? page?.title ?? fallback.title,
    description: page?.seoDescription ?? page?.description ?? fallback.description,
  };
}
