import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES = ['/dashboard', '/peminjaman', '/riwayat'];
const ADMIN_ROUTES = ['/admin'];
const SUPERADMIN_ROUTES = ['/superadmin'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('pelindo_session');

  let session: { role?: string } | null = null;
  if (sessionCookie?.value) {
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie.value));
    } catch {
      session = null;
    }
  }

  const isAuthenticated = !!session;
  const role = session?.role;

  // Superadmin only
  if (SUPERADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    if (!isAuthenticated || role !== 'Superadmin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Admin or Superadmin
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    if (!isAuthenticated || (role !== 'Admin' && role !== 'Superadmin')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Any authenticated user
  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect already-logged-in users away from /login
  if (pathname === '/login' && isAuthenticated) {
    if (role === 'Superadmin') return NextResponse.redirect(new URL('/superadmin', request.url));
    if (role === 'Admin') return NextResponse.redirect(new URL('/admin', request.url));
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next\\/static|_next\\/image|favicon\\.ico|image|icons).*)'],
};

