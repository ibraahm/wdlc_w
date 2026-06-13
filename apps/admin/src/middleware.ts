import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_URL || 'http://localhost:4000/api';
const IS_PROD = process.env.NODE_ENV === 'production';

const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/users', '/partners', '/network', '/agents', '/applications', '/audit', '/news', '/submissions', '/navigation', '/agent-dd', '/change-password'];
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// True when the signed-in user was given a password by another admin and hasn't
// chosen their own yet (flag stored in the `auser` session cookie).
function mustChangePassword(req: NextRequest): boolean {
  try {
    const raw = req.cookies.get('auser')?.value;
    return raw ? !!JSON.parse(raw).mustChangePassword : false;
  } catch {
    return false;
  }
}

function isPublicAuth(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
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

  const aat = req.cookies.get('aat')?.value;
  const art = req.cookies.get('art')?.value;

  const hasValidAat = aat && !isTokenExpired(aat);

  // Redirect logged-in users away from auth pages
  if (isPublicAuth(pathname) && hasValidAat) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Root redirect
  if (pathname === '/') {
    if (hasValidAat) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isProtected(pathname)) {
    if (hasValidAat) {
      if (mustChangePassword(req) && !pathname.startsWith('/change-password')) {
        return NextResponse.redirect(new URL('/change-password', req.url));
      }
      return NextResponse.next();
    }

    if (art) {
      try {
        const refreshRes = await fetch(`${API}/admin/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: art }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const needsChange = !!data.user?.mustChangePassword && !pathname.startsWith('/change-password');
          const response = needsChange
            ? NextResponse.redirect(new URL('/change-password', req.url))
            : NextResponse.next();

          response.cookies.set('aat', data.accessToken, {
            httpOnly: true,
            secure: IS_PROD,
            sameSite: 'lax',
            path: '/',
            maxAge: 900,
          });
          response.cookies.set('art', data.refreshToken, {
            httpOnly: true,
            secure: IS_PROD,
            sameSite: 'lax',
            path: '/',
            maxAge: 604800,
          });
          response.cookies.set('auser', JSON.stringify(data.user), {
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
    response.cookies.delete('aat');
    response.cookies.delete('art');
    response.cookies.delete('auser');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
