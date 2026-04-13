// middleware.js - Protect routes that require authentication
import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("access_token")?.value || 
                request.headers.get("Authorization")?.replace("Bearer ", "");
  
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth/login") || 
                     request.nextUrl.pathname.startsWith("/auth/register");
  
  const isProtectedPage = request.nextUrl.pathname.startsWith("/dashboard");
  const isAdminPage = request.nextUrl.pathname.startsWith("/admin");

  // If trying to access protected page without token, redirect to login
  if ((isProtectedPage || isAdminPage) && !token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // If trying to access admin page, check is_admin cookie
  if (isAdminPage) {
    const isAdmin = request.cookies.get("is_admin")?.value === "true";
    if (!isAdmin) {
      // Redirect to dashboard if not admin
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // If trying to access auth pages with token, redirect to dashboard/admin
  if (isAuthPage && token) {
    const isAdmin = request.cookies.get("is_admin")?.value === "true";
    return NextResponse.redirect(new URL(isAdmin ? "/admin/summary" : "/dashboard", request.url));
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