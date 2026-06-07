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
      const result = await apiRefresh(art);
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

  cookieStore.set(AAT, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });

  cookieStore.set(ART, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_MAX_AGE,
  });

  cookieStore.set(AUSER, JSON.stringify(user), {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(AAT);
  cookieStore.delete(ART);
  cookieStore.delete(AUSER);
}
