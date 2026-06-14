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

// Refresh tokens rotate on every use with reuse-detection on the backend. When
// several server components render concurrently and all find an expired access
// token, each would call apiRefresh() with the SAME refresh token - the first
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
      const result = await dedupedRefresh(prt);
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

  // cookies() is read-only during page/layout render; only Server Actions and
  // Route Handlers may mutate it. Guard the writes - a failed refresh-persist
  // just means we refresh again next request.
  try {
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
  } catch {
    // read-only cookie context (render) - ignore
  }
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = cookies();
  try {
    cookieStore.delete(PAT);
    cookieStore.delete(PRT);
    cookieStore.delete(PAGENT);
  } catch {
    // read-only cookie context (render) - ignore
  }
}
