const API = process.env.API_URL || 'http://localhost:4000';

const fetchOptions: RequestInit = {
  next: { revalidate: 60 },
};

export type Block = { type: string; data: Record<string, unknown> };

export type Page = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  blocks: Block[];
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
};

export type NavItem = {
  id: string;
  label: string;
  href: string;
  location: string;
  order: number;
  visible: boolean;
  children?: NavItem[];
};

type RawPage = Omit<Page, 'blocks'> & { blocks: string | Block[] };

function parseBlocks(raw: RawPage): Page {
  let blocks: Block[] = [];
  if (typeof raw.blocks === 'string') {
    try {
      blocks = JSON.parse(raw.blocks) as Block[];
    } catch {
      blocks = [];
    }
  } else if (Array.isArray(raw.blocks)) {
    blocks = raw.blocks;
  }
  return { ...raw, blocks };
}

export async function getPages(): Promise<Page[]> {
  try {
    const res = await fetch(`${API}/cms/pages/published`, fetchOptions);
    if (!res.ok) return [];
    const data: RawPage[] = await res.json();
    return data.map(parseBlocks);
  } catch {
    return [];
  }
}

export async function getPage(slug: string): Promise<Page | null> {
  try {
    const res = await fetch(`${API}/cms/pages/published/${slug}`, fetchOptions);
    if (!res.ok) return null;
    const data: RawPage = await res.json();
    return parseBlocks(data);
  } catch {
    return null;
  }
}

export async function getNav(location = 'HEADER'): Promise<NavItem[]> {
  try {
    const res = await fetch(
      `${API}/cms/nav?location=${encodeURIComponent(location)}`,
      fetchOptions,
    );
    if (!res.ok) return [];
    const data: NavItem[] = await res.json();
    return data;
  } catch {
    return [];
  }
}

export async function getSettings(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${API}/cms/settings`, fetchOptions);
    if (!res.ok) return {};
    const data: { key: string; value: string }[] = await res.json();
    const result: Record<string, unknown> = {};
    for (const item of data) {
      try {
        result[item.key] = JSON.parse(item.value);
      } catch {
        result[item.key] = item.value;
      }
    }
    return result;
  } catch {
    return {};
  }
}
