// Shared HTTP plumbing for the admin API modules. Kept here so each domain
// module (api.ts, api-training.ts, …) can reuse it without circular imports.

export const API = process.env.API_URL || 'http://localhost:4000/api';

export type HumanVerification = {
  humanVerificationToken?: string;
  humanVerificationAnswer?: string;
};

export async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    const text = await res.text();
    if (!text) return undefined as unknown as T;
    return JSON.parse(text) as T;
  }
  let message = `Request failed: ${res.status}`;
  try {
    const json = await res.json();
    message = json.message || json.error || message;
  } catch {
    // ignore parse error
  }
  throw new Error(message);
}

export async function authFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    ...(options.headers as Record<string, string>),
  };
  return fetch(`${API}${path}`, { ...options, headers });
}
