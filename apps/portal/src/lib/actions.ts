'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  apiLogin,
  apiSignup,
  apiLogout,
  apiForgotPassword,
  apiResetPassword,
  apiChangePassword,
} from './api';
import { setSessionCookies, clearSessionCookies } from './auth';

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const result = await apiLogin(email, password);
    await setSessionCookies(result.accessToken, result.refreshToken, result.agent);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Login failed.' };
  }

  redirect('/dashboard');
}

export async function signupAction(
  _prevState: { ok?: boolean; message?: string; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; message?: string; error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const phone = (formData.get('phone') as string) || undefined;

  if (!email || !password || !firstName || !lastName) {
    return { error: 'Please fill in all required fields.' };
  }

  try {
    const result = await apiSignup({ email, password, firstName, lastName, phone });
    return { ok: true, message: result.message || 'Check your email to verify your account.' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Signup failed.' };
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('pat')?.value;
  const refreshToken = cookieStore.get('prt')?.value;

  if (accessToken && refreshToken) {
    try {
      await apiLogout(accessToken, refreshToken);
    } catch {
      // Best effort — clear cookies regardless
    }
  }

  await clearSessionCookies();
  redirect('/login');
}

export async function forgotPasswordAction(
  _prevState: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required.' };
  }

  try {
    await apiForgotPassword(email);
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
    await apiChangePassword(accessToken, currentPassword, newPassword);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Password change failed.' };
  }
}
