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
  apiUpdateProfile,
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

export async function signupAction(
  _prevState: { ok?: boolean; message?: string; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; message?: string; error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const phone = (formData.get('phone') as string) || undefined;
  const humanVerificationToken = (formData.get('humanVerificationToken') as string) || undefined;
  const humanVerificationAnswer = (formData.get('humanVerificationAnswer') as string) || undefined;

  if (!email || !password || !firstName || !lastName) {
    return { error: 'Please fill in all required fields.' };
  }

  try {
    const result = await apiSignup({ email, password, firstName, lastName, phone, humanVerificationToken, humanVerificationAnswer });
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

export async function updateProfileAction(
  _prevState: { ok?: boolean; error?: string; geocoded?: boolean } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string; geocoded?: boolean }> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('pat')?.value;
  if (!accessToken) return { error: 'Not authenticated.' };

  const data = {
    businessName: (formData.get('businessName') as string) || undefined,
    addressLine: (formData.get('addressLine') as string) || undefined,
    city: (formData.get('city') as string) || undefined,
    state: (formData.get('state') as string) || undefined,
    zip: (formData.get('zip') as string) || undefined,
    country: (formData.get('country') as string) || undefined,
    publicPhone: (formData.get('publicPhone') as string) || undefined,
    showOnMap: formData.get('showOnMap') === 'on',
  };

  try {
    const result = await apiUpdateProfile(accessToken, data);
    revalidatePath('/profile');
    // When the agent opts into the map but the address could not be geocoded,
    // warn them their pin won't appear yet.
    const geocoded = result.latitude !== null && result.longitude !== null;
    return { ok: true, geocoded: data.showOnMap ? geocoded : undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Update failed.' };
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
