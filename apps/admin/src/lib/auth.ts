import { cookies } from 'next/headers';
import { apiRefresh, type AdminUser } from './api';

const AAT = 'aat';
const ART = 'art';
const AUSER = 'auser';

const ACCESS_MAX_AGE = 900; // 15 min
const REFRESH_MAX_AGE = 604800; // 7 days

export type Session = {
  accessToken: string;
  user: AdminUser;
};

// Refresh tokens rotate on every use with reuse-detection on the backend. When
// several server components render concurrently and all find an expired access
// token, each would call apiRefresh() with the SAME refresh token — the first
// rotates it, the rest present a now-revoked token and trip reuse-detection,
// logging the user out. Collapse concurrent refreshes for a given token into a
// single in-flight promise so only one rotation happens per request burst.
type RefreshResult = Awaited<ReturnType<typeof apiRefresh>>;
const inFlight = new Map<string, Promise<RefreshResult>>();

function dedupedRefresh(token: string): Promise<RefreshResult> {
  const existing = inFlight.get(token);
  if (existing) return existing;
  const p = apiRefresh(token).finally(() => inFlight.delete(token));
  inFlight.set(token, p);
  return p;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies();
  const aat = cookieStore.get(AAT)?.value;
  const art = cookieStore.get(ART)?.value;
  const auserRaw = cookieStore.get(AUSER)?.value;

  if (aat && auserRaw) {
    try {
      const user = JSON.parse(auserRaw) as AdminUser;
      return { accessToken: aat, user };
    } catch {
      // fall through to refresh
    }
  }

  if (art) {
    try {
      const result = await dedupedRefresh(art);
      await setSessionCookies(result.accessToken, result.refreshToken, result.user);
      return { accessToken: result.accessToken, user: result.user };
    } catch {
      await clearSessionCookies();
      return null;
    }
  }

  return null;
}

export async function setSessionCookies(
  accessToken: string,
  refreshToken: string,
  user: AdminUser,
): Promise<void> {
  const cookieStore = cookies();

  const secure = process.env.NODE_ENV === 'production';

  // cookies() is read-only during page/layout render; only Server Actions and
  // Route Handlers may mutate it. getSession() runs in both contexts, so guard
  // the writes — a failed refresh-persist just means we refresh again next request.
  try {
    cookieStore.set(AAT, accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_MAX_AGE,
    });

    cookieStore.set(ART, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_MAX_AGE,
    });

    cookieStore.set(AUSER, JSON.stringify(user), {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_MAX_AGE,
    });
  } catch {
    // read-only cookie context (render) — ignore
  }
}

// After a forced password change, drop the flag from the session cookie so the
// middleware stops redirecting to /change-password for the rest of this session.
export async function clearMustChangePassword(): Promise<void> {
  const cookieStore = cookies();
  const auserRaw = cookieStore.get(AUSER)?.value;
  if (!auserRaw) return;
  try {
    const user = JSON.parse(auserRaw) as AdminUser;
    user.mustChangePassword = false;
    cookieStore.set(AUSER, JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_MAX_AGE,
    });
  } catch {
    // ignore
  }
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = cookies();
  try {
    cookieStore.delete(AAT);
    cookieStore.delete(ART);
    cookieStore.delete(AUSER);
  } catch {
    // read-only cookie context (render) — ignore
  }
}
