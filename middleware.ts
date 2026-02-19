import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Better Auth Middleware Example
 *
 * This middleware demonstrates how to protect routes at the server level
 * before the page even loads. This is more secure than client-side protection.
 *
 * To enable this middleware, rename this file to middleware.ts
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define protected routes
  const protectedRoutes = ["/protected-demo", "/dashboard"];
  const authRoutes = ["/auth-demo"];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Check for session cookie
  const sessionToken = request.cookies.get("better-auth.session_token");

  // If trying to access protected route without session, redirect to auth demo
  if (isProtectedRoute && !sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth-demo";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // If already authenticated and trying to access auth page, redirect to dashboard
  if (isAuthRoute && sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
