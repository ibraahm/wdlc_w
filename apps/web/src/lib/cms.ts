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
  const url = `${API}/cms/nav`;
  const start = Date.now();
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    console.log(`[CMS] GET ${url} → ${res.status} (${Date.now() - start}ms)`);
    if (!res.ok) return null;
    const items: CmsNavItem[] = await res.json();
    const filtered = items.filter((i) => i.location === 'HEADER' && i.visible);
    console.log(`[CMS] nav items returned: ${items.length} total, ${filtered.length} HEADER visible. Hrefs: ${filtered.map(i => i.href).join(', ')}`);
    return filtered;
  } catch (e) {
    console.error(`[CMS] nav fetch failed:`, e);
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
  const url = `${API}/cms/pages/published/${slug}`;
  const start = Date.now();
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    console.log(`[CMS] GET ${url} → ${res.status} (${Date.now() - start}ms) caller=${new Error().stack?.split('\n')[2]?.trim()}`);
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error(`[CMS] page fetch failed for "${slug}":`, e);
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
