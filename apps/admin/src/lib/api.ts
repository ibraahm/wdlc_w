const API = process.env.API_URL || 'http://localhost:4000/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  active?: boolean;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
};

export type Page = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: string;
  blocks: string;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
  authorId?: string;
  updatedAt?: string;
  createdAt?: string;
};

export type NavItem = {
  id: string;
  label: string;
  href: string;
  location: string;
  column?: string;
  order: number;
  visible: boolean;
  parentId?: string;
  children?: NavItem[];
};

export type Block = {
  type: 'hero' | 'text' | 'features' | 'cta';
  data: Record<string, unknown>;
};

export type Setting = {
  key: string;
  value: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function handleResponse<T>(res: Response): Promise<T> {
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

async function authFetch(
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

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function apiLogin(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResult>(res);
}

export async function apiRefresh(refreshToken: string): Promise<AuthResult> {
  const res = await fetch(`${API}/admin/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return handleResponse<AuthResult>(res);
}

export async function apiLogout(accessToken: string, refreshToken: string): Promise<void> {
  const res = await authFetch('/admin/auth/logout', accessToken, {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  await handleResponse<void>(res);
}

export async function apiForgotPassword(email: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/admin/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse<{ ok: boolean }>(res);
}

export async function apiResetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/admin/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  return handleResponse<{ ok: boolean }>(res);
}

export async function apiChangePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  const res = await authFetch('/admin/auth/change-password', accessToken, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse<{ ok: boolean }>(res);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function apiListUsers(accessToken: string): Promise<AdminUser[]> {
  const res = await authFetch('/admin/auth/users', accessToken);
  return handleResponse<AdminUser[]>(res);
}

export async function apiCreateUser(
  accessToken: string,
  data: { email: string; name: string; password: string; role?: string },
): Promise<AdminUser> {
  const res = await authFetch('/admin/auth/users', accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<AdminUser>(res);
}

export async function apiSetUserActive(
  accessToken: string,
  id: string,
  active: boolean,
): Promise<{ id: string; active: boolean }> {
  const res = await authFetch(`/admin/auth/users/${id}/active`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
  return handleResponse<{ id: string; active: boolean }>(res);
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export async function apiListPages(accessToken: string, status?: string): Promise<Page[]> {
  const url = status ? `/cms/pages?status=${status}` : '/cms/pages';
  const res = await authFetch(url, accessToken);
  return handleResponse<Page[]>(res);
}

export async function apiGetPage(accessToken: string, slug: string): Promise<Page> {
  const res = await authFetch(`/cms/pages/${slug}`, accessToken);
  return handleResponse<Page>(res);
}

export async function apiCreatePage(accessToken: string, data: Partial<Page>): Promise<Page> {
  const res = await authFetch('/cms/pages', accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<Page>(res);
}

export async function apiUpdatePage(
  accessToken: string,
  slug: string,
  data: Partial<Page>,
): Promise<Page> {
  const res = await authFetch(`/cms/pages/${slug}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<Page>(res);
}

export async function apiPublishPage(accessToken: string, slug: string): Promise<Page> {
  const res = await authFetch(`/cms/pages/${slug}/publish`, accessToken, { method: 'PATCH' });
  return handleResponse<Page>(res);
}

export async function apiUnpublishPage(accessToken: string, slug: string): Promise<Page> {
  const res = await authFetch(`/cms/pages/${slug}/unpublish`, accessToken, { method: 'PATCH' });
  return handleResponse<Page>(res);
}

export async function apiDeletePage(accessToken: string, slug: string): Promise<void> {
  const res = await authFetch(`/cms/pages/${slug}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

export async function apiGetNav(accessToken: string): Promise<NavItem[]> {
  const res = await authFetch('/cms/nav', accessToken);
  return handleResponse<NavItem[]>(res);
}

export async function apiCreateNavItem(
  accessToken: string,
  data: Partial<NavItem>,
): Promise<NavItem> {
  const res = await authFetch('/cms/nav', accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<NavItem>(res);
}

export async function apiUpdateNavItem(
  accessToken: string,
  id: string,
  data: Partial<NavItem>,
): Promise<NavItem> {
  const res = await authFetch(`/cms/nav/${id}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<NavItem>(res);
}

export async function apiDeleteNavItem(accessToken: string, id: string): Promise<void> {
  const res = await authFetch(`/cms/nav/${id}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}

export async function apiReorderNav(
  accessToken: string,
  items: { id: string; order: number }[],
): Promise<void> {
  const res = await authFetch('/cms/nav/reorder', accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ items }),
  });
  await handleResponse<void>(res);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function apiGetSettings(accessToken: string): Promise<Setting[]> {
  const res = await authFetch('/cms/settings', accessToken);
  return handleResponse<Setting[]>(res);
}

export async function apiSetSetting(
  accessToken: string,
  key: string,
  value: string,
): Promise<void> {
  const res = await authFetch(`/cms/settings/${key}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
  await handleResponse<void>(res);
}

export async function apiDeleteSetting(accessToken: string, key: string): Promise<void> {
  const res = await authFetch(`/cms/settings/${key}`, accessToken, { method: 'DELETE' });
  await handleResponse<void>(res);
}
