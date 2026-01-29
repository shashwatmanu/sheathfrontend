// middleware.js - Protect routes that require authentication
import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("access_token")?.value || 
                request.headers.get("Authorization")?.replace("Bearer ", "");
  
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth/login") || 
                     request.nextUrl.pathname.startsWith("/auth/register");
  
  const isProtectedPage = request.nextUrl.pathname.startsWith("/dashboard");
  const isRootPage = request.nextUrl.pathname === "/";

  // If trying to access protected page without token, redirect to login
  if (isProtectedPage && !token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Handle root page redirection based on authentication
  if (isRootPage) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // If trying to access auth pages with token, redirect to dashboard
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};