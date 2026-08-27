import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public routes
  if (pathname === '/login' || pathname === '/' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Protect dashboard routes - just check if cookie exists
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
