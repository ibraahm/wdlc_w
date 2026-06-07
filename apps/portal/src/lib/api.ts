const API = process.env.API_URL || 'http://localhost:4000/api';

export type Agent = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  emailVerified: boolean;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  agent: Agent;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }
  let message = 'Request failed';
  try {
    const json = await res.json();
    message = json.message || json.error || message;
  } catch {
    // ignore parse error
  }
  throw new Error(message);
}

export async function apiSignup(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<{ ok: boolean; message: string; agent: Agent }> {
  const res = await fetch(`${API}/portal/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function apiVerifyEmail(token: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API}/portal/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return handleResponse(res);
}

export async function apiResendVerification(email: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/portal/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

export async function apiLogin(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API}/portal/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function apiRefresh(refreshToken: string): Promise<AuthResult> {
  const res = await fetch(`${API}/portal/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return handleResponse(res);
}

export async function apiLogout(accessToken: string, refreshToken: string): Promise<void> {
  await fetch(`${API}/portal/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });
}

export async function apiForgotPassword(email: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/portal/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

export async function apiResetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/portal/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  return handleResponse(res);
}

export async function apiChangePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/portal/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse(res);
}
