import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_URL || 'http://localhost:4000/api';
const IS_PROD = process.env.NODE_ENV === 'production';

const PROTECTED_PATHS = ['/dashboard', '/training', '/resources', '/settings'];
const AUTH_PATHS = ['/login', '/signup'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isTokenExpired(token: string): boolean {
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return typeof decoded.exp === 'number' && decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const pat = req.cookies.get('pat')?.value;
  const prt = req.cookies.get('prt')?.value;

  const hasValidPat = pat && !isTokenExpired(pat);

  if (isAuthPage(pathname) && hasValidPat) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (isProtected(pathname)) {
    if (hasValidPat) {
      return NextResponse.next();
    }

    if (prt) {
      try {
        const refreshRes = await fetch(`${API}/portal/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: prt }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const response = NextResponse.next();

          response.cookies.set('pat', data.accessToken, {
            httpOnly: true,
            secure: IS_PROD,
            sameSite: 'lax',
            path: '/',
            maxAge: 900,
          });
          response.cookies.set('prt', data.refreshToken, {
            httpOnly: true,
            secure: IS_PROD,
            sameSite: 'lax',
            path: '/',
            maxAge: 604800,
          });
          response.cookies.set('pagent', JSON.stringify(data.agent), {
            httpOnly: true,
            secure: IS_PROD,
            sameSite: 'lax',
            path: '/',
            maxAge: 900,
          });

          return response;
        }
      } catch {
        // Refresh failed — fall through to redirect
      }
    }

    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('pat');
    response.cookies.delete('prt');
    response.cookies.delete('pagent');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
