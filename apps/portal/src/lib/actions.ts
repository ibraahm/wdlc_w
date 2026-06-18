'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  apiLogin,
    apiLogout,
  apiGoogleLogin,
  apiForgotPassword,
  apiResetPassword,
  apiChangePassword,
  apiSubmitQuiz,
  apiAckResource,
  apiCompleteLesson,
  apiAcknowledgePolicy,
  apiSetLanguage,
  apiCreateRequest,
  apiRequestMessage,
  type QuizResult,
} from './api';
import { revalidatePath } from 'next/cache';
import { setSessionCookies, clearSessionCookies } from './auth';

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const humanVerificationToken = (formData.get('humanVerificationToken') as string) || undefined;
  const humanVerificationAnswer = (formData.get('humanVerificationAnswer') as string) || undefined;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const result = await apiLogin(email, password, { humanVerificationToken, humanVerificationAnswer });
    await setSessionCookies(result.accessToken, result.refreshToken, result.agent);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Login failed.' };
  }

  redirect('/dashboard');
}

export async function googleLoginAction(credential: string): Promise<{ error?: string }> {
  if (!credential) return { error: 'Missing Google credential.' };
  try {
    const result = await apiGoogleLogin(credential);
    await setSessionCookies(result.accessToken, result.refreshToken, result.agent);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Google sign-in failed.' };
  }
  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('pat')?.value;
  const refreshToken = cookieStore.get('prt')?.value;

  if (accessToken && refreshToken) {
    try {
      await apiLogout(accessToken, refreshToken);
    } catch {
      // Best effort - clear cookies regardless
    }
  }

  await clearSessionCookies();
  // Redirect to the configured public login URL when set, so a server-action
  // redirect behind a proxy can't fall back to localhost:port; relative path
  // is used for local dev.
  const base = process.env.NEXT_PUBLIC_PORTAL_URL?.replace(/\/+$/, '');
  redirect(base ? `${base}/login` : '/login');
}

export async function forgotPasswordAction(
  _prevState: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const email = formData.get('email') as string;
  const humanVerificationToken = (formData.get('humanVerificationToken') as string) || undefined;
  const humanVerificationAnswer = (formData.get('humanVerificationAnswer') as string) || undefined;

  if (!email) {
    return { error: 'Email is required.' };
  }

  try {
    await apiForgotPassword(email, { humanVerificationToken, humanVerificationAnswer });
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Request failed.' };
  }
}

export async function resetPasswordAction(
  _prevState: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const token = formData.get('token') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!token || !newPassword) {
    return { error: 'Missing required fields.' };
  }

  try {
    await apiResetPassword(token, newPassword);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Reset failed.' };
  }
}

export async function changePasswordAction(
  _prevState: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('pat')?.value;

  if (!accessToken) {
    return { error: 'Not authenticated.' };
  }

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!currentPassword || !newPassword) {
    return { error: 'Both current and new password are required.' };
  }

  try {
    const result = await apiChangePassword(accessToken, currentPassword, newPassword);
    // The backend rotates tokens (and clears the forced-change flag); refresh
    // our session cookies so the change takes effect immediately.
    if (result.accessToken && result.refreshToken && result.agent) {
      await setSessionCookies(result.accessToken, result.refreshToken, result.agent as never);
    }
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Password change failed.' };
  }
}

// ── Training ────────────────────────────────────────────────────────────────

export async function submitQuizAction(
  slug: string,
  answers: number[],
): Promise<{ result?: QuizResult; error?: string }> {
  const accessToken = cookies().get('pat')?.value;
  if (!accessToken) return { error: 'Not authenticated.' };
  try {
    const result = await apiSubmitQuiz(accessToken, slug, answers);
    revalidatePath('/training');
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not submit quiz.' };
  }
}

export async function completeLessonAction(lessonId: string): Promise<{ ok?: boolean; error?: string }> {
  const accessToken = cookies().get('pat')?.value;
  if (!accessToken) return { error: 'Not authenticated.' };
  try {
    await apiCompleteLesson(accessToken, lessonId);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save progress.' };
  }
}

export async function acknowledgePolicyAction(
  slug: string,
): Promise<{ ok?: boolean; version?: number; acknowledgedAt?: string; error?: string }> {
  const accessToken = cookies().get('pat')?.value;
  if (!accessToken) return { error: 'Not authenticated.' };
  try {
    const res = await apiAcknowledgePolicy(accessToken, slug);
    return { ok: true, version: res.version, acknowledgedAt: res.acknowledgedAt };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not record your acknowledgment.' };
  }
}

export async function setLanguageAction(language: string): Promise<{ ok?: boolean; error?: string }> {
  const accessToken = cookies().get('pat')?.value;
  if (!accessToken) return { error: 'Not authenticated.' };
  try {
    await apiSetLanguage(accessToken, language);
    // Mirror the choice into a cookie so the root layout can set <html lang/dir>.
    cookies().set('plang', language, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    revalidatePath('/training');
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not change language.' };
  }
}

export async function ackResourceAction(id: string): Promise<{ ok?: boolean; error?: string }> {
  const accessToken = cookies().get('pat')?.value;
  if (!accessToken) return { error: 'Not authenticated.' };
  try {
    await apiAckResource(accessToken, id);
    revalidatePath('/resources');
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not acknowledge.' };
  }
}

// ── Agent requests to regional office ───────────────────────────────────────

export async function createRequestAction(
  data: { type: string; subject: string; details?: string; attachments?: { name: string; url: string }[] },
): Promise<{ ok?: boolean; id?: string; error?: string }> {
  const accessToken = cookies().get('pat')?.value;
  if (!accessToken) return { error: 'Not authenticated.' };
  try {
    const r = await apiCreateRequest(accessToken, data);
    revalidatePath('/requests');
    return { ok: true, id: r.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not submit request.' };
  }
}

export async function requestMessageAction(id: string, body: string): Promise<{ ok?: boolean; error?: string }> {
  const accessToken = cookies().get('pat')?.value;
  if (!accessToken) return { error: 'Not authenticated.' };
  try {
    await apiRequestMessage(accessToken, id, body);
    revalidatePath(`/requests/${id}`);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not send message.' };
  }
}
