const API = process.env.API_URL || 'http://localhost:4000/api';

export type CmsNavItem = {
  id: string;
  label: string;
  href: string;
  location: string;
  order: number;
  visible: boolean;
  children?: CmsNavItem[];
};

// Fetch header nav from CMS. Returns null if backend is unavailable.
export async function getCmsNav(): Promise<CmsNavItem[] | null> {
  try {
    const res = await fetch(`${API}/cms/nav`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const items: CmsNavItem[] = await res.json();
    return items.filter((i) => i.location === 'HEADER' && i.visible);
  } catch {
    return null;
  }
}

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
