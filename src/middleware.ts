import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /edit and /admin routes
  if (pathname === '/edit' || pathname.startsWith('/admin')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Admin routes require admin role
    if (pathname.startsWith('/admin') && token.role !== 'admin') {
      const editUrl = new URL('/edit', req.url);
      return NextResponse.redirect(editUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/edit', '/admin/:path*'],
};
