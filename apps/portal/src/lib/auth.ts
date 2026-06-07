import { cookies } from 'next/headers';
import { apiRefresh, type Agent } from './api';

const PAT = 'pat';
const PRT = 'prt';
const PAGENT = 'pagent';

const ACCESS_MAX_AGE = 900; // 15 min
const REFRESH_MAX_AGE = 604800; // 7 days

export type Session = {
  accessToken: string;
  agent: Agent;
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies();
  const pat = cookieStore.get(PAT)?.value;
  const prt = cookieStore.get(PRT)?.value;
  const pagentRaw = cookieStore.get(PAGENT)?.value;

  if (pat && pagentRaw) {
    try {
      const agent = JSON.parse(pagentRaw) as Agent;
      return { accessToken: pat, agent };
    } catch {
      // fall through to refresh
    }
  }

  if (prt) {
    try {
      const result = await apiRefresh(prt);
      await setSessionCookies(result.accessToken, result.refreshToken, result.agent);
      return { accessToken: result.accessToken, agent: result.agent };
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
  agent: Agent,
): Promise<void> {
  const cookieStore = cookies();

  const secure = process.env.NODE_ENV === 'production';

  cookieStore.set(PAT, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });

  cookieStore.set(PRT, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_MAX_AGE,
  });

  cookieStore.set(PAGENT, JSON.stringify(agent), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(PAT);
  cookieStore.delete(PRT);
  cookieStore.delete(PAGENT);
}
