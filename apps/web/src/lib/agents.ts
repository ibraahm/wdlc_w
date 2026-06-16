const API = process.env.API_URL || 'http://localhost:4000/api';

export type AgentLocation = {
  id: string;
  businessName: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  publicPhone: string | null;
  latitude: number;
  longitude: number;
};

export async function getAgentLocations(): Promise<AgentLocation[]> {
  try {
    const res = await fetch(`${API}/agents/locations`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return (await res.json()) as AgentLocation[];
  } catch {
    return [];
  }
}

function slugifyPart(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Stable, human-readable, collision-proof slug for a location's public page.
// The id suffix guarantees uniqueness even when two agents share a city/name.
export function locationSlug(loc: AgentLocation): string {
  const base = [loc.businessName, loc.city, loc.state].map(slugifyPart).filter(Boolean).join('-');
  const suffix = loc.id.slice(-6).toLowerCase();
  return base ? `${base}-${suffix}` : `location-${suffix}`;
}

export async function getAgentLocationBySlug(slug: string): Promise<AgentLocation | null> {
  const all = await getAgentLocations();
  return all.find((loc) => locationSlug(loc) === slug) ?? null;
}
