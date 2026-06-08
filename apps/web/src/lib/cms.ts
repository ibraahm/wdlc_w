import { cache } from 'react';

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

export type CmsPage = {
  slug: string;
  title: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  blocks: unknown[];
  status: string;
};

// React cache() deduplicates calls with the same slug within a single request —
// generateMetadata and the page component both call this but only one fetch fires.
export const getCmsPage = cache(async (slug: string): Promise<CmsPage | null> => {
  try {
    const res = await fetch(`${API}/cms/pages/published/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
});

// Nav is fetched once per layout render and cached at the ISR level.
export const getCmsNav = cache(async (): Promise<CmsNavItem[] | null> => {
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
});

// Top utility-bar nav (always-visible links above the primary menu).
export const getCmsUtilityNav = cache(async (): Promise<CmsNavItem[] | null> => {
  try {
    const res = await fetch(`${API}/cms/nav`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const items: CmsNavItem[] = await res.json();
    return items.filter((i) => i.location === 'UTILITY' && i.visible);
  } catch {
    return null;
  }
});

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
