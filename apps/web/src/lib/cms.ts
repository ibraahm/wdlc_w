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

export type CmsFormField = {
  id: string;
  type: string;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  width?: 'full' | 'half';
  helpText?: string;
};

export type CmsForm = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  fields: CmsFormField[];
  status: string;
  submitLabel: string;
  successMessage: string;
  recaptcha: boolean;
};

// Fetch a single published, CMS-built form by slug.
export const getCmsForm = cache(async (slug: string): Promise<CmsForm | null> => {
  try {
    const res = await fetch(`${API}/cms/forms/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
});

export type CmsPartner = {
  id: string;
  name: string;
  type: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  region?: string;
  featured: boolean;
  active: boolean;
  order: number;
};

export type CmsNetworkCountry = {
  id: string;
  name: string;
  payoutTypes: string[];
  flagUrl?: string;
  active: boolean;
};

export const getCmsNetworkCountries = cache(async (): Promise<CmsNetworkCountry[]> => {
  try {
    const res = await fetch(`${API}/cms/network`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
});

export const getCmsPartners = cache(async (): Promise<CmsPartner[]> => {
  try {
    const res = await fetch(`${API}/cms/partners`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
});

// Fetch all public (allowlisted) settings in a single request. The backend
// returns rows as { key, value } where value is a serialized JSON string, so
// each value is parsed here into a key → value map. Cached per render.
export const getCmsPublicSettings = cache(async (): Promise<Record<string, unknown>> => {
  try {
    const res = await fetch(`${API}/cms/settings/public`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const rows = (await res.json()) as { key: string; value: string }[];
    const map: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        map[row.key] = JSON.parse(row.value);
      } catch {
        map[row.key] = row.value;
      }
    }
    return map;
  } catch {
    return {};
  }
});

// Read a single public site setting (parsed JSON) by key, with a typed
// fallback. Backed by the batched public-settings fetch above, so multiple
// reads in one render share a single backend request.
export const getCmsSetting = cache(async <T,>(key: string, fallback: T): Promise<T> => {
  try {
    const settings = await getCmsPublicSettings();
    const value = settings[key];
    return (value ?? fallback) as T;
  } catch {
    return fallback;
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

export type NewsPostSummary = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary?: string;
  author?: string;
  imageUrl?: string;
  publishedAt?: string;
  createdAt: string;
};

export type NewsPostFull = NewsPostSummary & { body: string };

export const getCmsNewsPosts = cache(async (category?: string): Promise<NewsPostSummary[]> => {
  try {
    const qs = category ? `?category=${category}` : '';
    const res = await fetch(`${API}/cms/news${qs}`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
});

export const getCmsNewsPost = cache(async (slug: string): Promise<NewsPostFull | null> => {
  try {
    const res = await fetch(`${API}/cms/news/${slug}`, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
});
