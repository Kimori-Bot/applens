import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

export function middleware(request) {
  const token = request.cookies.get('token')?.value || 
    request.headers.get('authorization')?.replace('Bearer ', '');
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/register');
  
  const isPublicPage = request.nextUrl.pathname === '/' || 
    request.nextUrl.pathname.startsWith('/api/auth');
  
  // Allow public API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Allow auth endpoints
    if (request.nextUrl.pathname.includes('/auth/login') || 
        request.nextUrl.pathname.includes('/auth/register')) {
      return NextResponse.next();
    }
    
    // For other API routes, token will be handled in the route itself
    return NextResponse.next();
  }
  
  // Allow media files (screenshots, videos)
  if (request.nextUrl.pathname.startsWith('/media/')) {
    return NextResponse.next();
  }
  
  // Allow public pages
  if (isAuthPage || isPublicPage) {
    return NextResponse.next();
  }
  
  // Allow dashboard for demo (bypass auth)
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }
  
  // Check for token
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
