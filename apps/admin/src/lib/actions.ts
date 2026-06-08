'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  apiLogin,
  apiLogout,
  apiForgotPassword,
  apiResetPassword,
  apiChangePassword,
  apiCreatePage,
  apiUpdatePage,
  apiPublishPage,
  apiUnpublishPage,
  apiDeletePage,
  apiSetSetting,
  apiCreateNavItem,
  apiUpdateNavItem,
  apiDeleteNavItem,
  apiCreateUser,
  apiSetUserActive,
  apiSetAgentStatus,
  apiSetAgentVisibility,
  apiToggleLocationActive,
  apiDeleteLocation,
  apiSetApplicationStatus,
  apiDeleteApplication,
} from './api';
import { getSession, setSessionCookies, clearSessionCookies } from './auth';

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const result = await apiLogin(email, password);
    await setSessionCookies(result.accessToken, result.refreshToken, result.user);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Login failed' };
  }

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) {
    try {
      // We don't have the refresh token here but we can still clear cookies
      await clearSessionCookies();
    } catch {
      await clearSessionCookies();
    }
  } else {
    await clearSessionCookies();
  }
  redirect('/login');
}

export async function forgotPasswordAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const email = formData.get('email') as string;
  try {
    await apiForgotPassword(email);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

export async function resetPasswordAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const token = formData.get('token') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (newPassword !== confirmPassword) {
    return { ok: false, error: 'Passwords do not match' };
  }

  try {
    await apiResetPassword(token, newPassword);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Reset failed' };
  }
}

export async function changePasswordAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  try {
    await apiChangePassword(session.accessToken, currentPassword, newPassword);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Change password failed' };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function revalidateWebPage(slug: string) {
  const webUrl = process.env.WEB_URL || 'http://localhost:3000';
  const secret = process.env.REVALIDATE_SECRET || 'wdlc-revalidate-dev';
  try {
    await fetch(`${webUrl}/api/revalidate?token=${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `/${slug}` }),
    });
  } catch {
    // Non-fatal: web app may not be running
  }
}

// ---------------------------------------------------------------------------
// Page actions
// ---------------------------------------------------------------------------

export async function createPageAction(
  formData: FormData,
): Promise<{ page?: { slug: string }; error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const blocksRaw = formData.get('blocks') as string;

  try {
    const page = await apiCreatePage(session.accessToken, {
      slug: formData.get('slug') as string,
      title: formData.get('title') as string,
      description: (formData.get('description') as string) || undefined,
      blocks: JSON.parse(blocksRaw || '[]'),
      seoTitle: (formData.get('seoTitle') as string) || undefined,
      seoDescription: (formData.get('seoDescription') as string) || undefined,
    });
    revalidatePath('/pages');
    return { page };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updatePageAction(
  formData: FormData,
): Promise<{ page?: { slug: string }; error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const slug = formData.get('slug') as string;
  const blocksRaw = formData.get('blocks') as string;

  try {
    const page = await apiUpdatePage(session.accessToken, slug, {
      title: formData.get('title') as string,
      description: (formData.get('description') as string) || undefined,
      blocks: JSON.parse(blocksRaw || '[]'),
      seoTitle: (formData.get('seoTitle') as string) || undefined,
      seoDescription: (formData.get('seoDescription') as string) || undefined,
    });
    revalidatePath('/pages');
    await revalidateWebPage(slug);
    return { page };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function publishPageAction(slug: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  try {
    await apiPublishPage(session.accessToken, slug);
    revalidatePath('/pages');
    await revalidateWebPage(slug);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Publish failed' };
  }
}

export async function unpublishPageAction(slug: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  try {
    await apiUnpublishPage(session.accessToken, slug);
    revalidatePath('/pages');
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unpublish failed' };
  }
}

export async function deletePageAction(slug: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login');

  await apiDeletePage(session.accessToken, slug);
  revalidatePath('/pages');
  redirect('/pages');
}

// ---------------------------------------------------------------------------
// Settings actions
// ---------------------------------------------------------------------------

export async function saveSettingsAction(
  entries: { key: string; value: string }[],
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  try {
    await Promise.all(entries.map(({ key, value }) => apiSetSetting(session.accessToken, key, value)));
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export async function addSettingAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  const key = formData.get('key') as string;
  const value = formData.get('value') as string;

  try {
    await apiSetSetting(session.accessToken, key, value);
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Add failed' };
  }
}

// ---------------------------------------------------------------------------
// Nav actions
// ---------------------------------------------------------------------------

export async function createNavItemAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  try {
    await apiCreateNavItem(session.accessToken, {
      label: formData.get('label') as string,
      href: formData.get('href') as string,
      location: (formData.get('location') as string) || 'header',
      column: (formData.get('column') as string) || undefined,
      order: parseInt((formData.get('order') as string) || '0', 10),
      parentId: (formData.get('parentId') as string) || undefined,
    });
    revalidatePath('/nav');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updateNavItemAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  const id = formData.get('id') as string;

  try {
    await apiUpdateNavItem(session.accessToken, id, {
      label: formData.get('label') as string,
      href: formData.get('href') as string,
      location: (formData.get('location') as string) || 'header',
      column: (formData.get('column') as string) || undefined,
      order: parseInt((formData.get('order') as string) || '0', 10),
      visible: formData.get('visible') === 'true',
    });
    revalidatePath('/nav');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteNavItemAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  try {
    await apiDeleteNavItem(session.accessToken, id);
    revalidatePath('/nav');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

// ---------------------------------------------------------------------------
// User actions
// ---------------------------------------------------------------------------

export async function createUserAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  try {
    await apiCreateUser(session.accessToken, {
      email: formData.get('email') as string,
      name: formData.get('name') as string,
      password: formData.get('password') as string,
      role: (formData.get('role') as string) || undefined,
    });
    revalidatePath('/users');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function setAgentStatusAction(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSetAgentStatus(session.accessToken, id, status);
    revalidatePath('/agents');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function setAgentVisibilityAction(
  id: string,
  showOnMap: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSetAgentVisibility(session.accessToken, id, showOnMap);
    revalidatePath('/agents');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function toggleLocationActiveAction(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiToggleLocationActive(session.accessToken, id, active);
    revalidatePath('/agents');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteLocationAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeleteLocation(session.accessToken, id);
    revalidatePath('/agents');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function setApplicationStatusAction(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiSetApplicationStatus(session.accessToken, id, status);
    revalidatePath('/applications');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteApplicationAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    await apiDeleteApplication(session.accessToken, id);
    revalidatePath('/applications');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function setUserActiveAction(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };

  try {
    await apiSetUserActive(session.accessToken, id, active);
    revalidatePath('/users');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}
