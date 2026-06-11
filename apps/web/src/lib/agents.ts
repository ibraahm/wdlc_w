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
