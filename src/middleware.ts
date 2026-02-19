import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

export function middleware(request) {
  const token = request.cookies.get('token')?.value || 
    request.headers.get('authorization')?.replace('Bearer ', '');
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password');
  
  const isPublicPage = request.nextUrl.pathname === '/' || 
    request.nextUrl.pathname.startsWith('/api/auth');
  
  // Allow public API routes (auth endpoints)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Allow auth endpoints (login, register, reset-password)
    if (request.nextUrl.pathname.includes('/auth/login') || 
        request.nextUrl.pathname.includes('/auth/register') ||
        request.nextUrl.pathname.includes('/auth/reset-password')) {
      return NextResponse.next();
    }
    
    // For other API routes, check token
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    return NextResponse.next();
  }
  
  // Allow media files (screenshots, videos)
  if (request.nextUrl.pathname.startsWith('/media/')) {
    return NextResponse.next();
  }
  
  // Redirect to login if accessing protected pages without auth
  if (!token && !isAuthPage && !isPublicPage) {
    // Allow dashboard in demo mode - remove this for production
    if (!request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // If authenticated and trying to access auth pages, redirect to dashboard
  if (token && isAuthPage) {
    const payload = verifyToken(token);
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
