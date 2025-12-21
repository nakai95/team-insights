import { auth } from "@/infrastructure/auth/auth.config";
import { NextResponse } from "next/server";

/**
 * Middleware for Route Protection
 *
 * Handles authentication checks and redirects for all routes.
 * Runs before page rendering for optimal performance.
 *
 * Features:
 * - Redirects unauthenticated users to login page
 * - Redirects authenticated users away from auth pages
 * - Handles session errors gracefully
 * - Allows public routes without authentication
 *
 * Route Patterns:
 * - Public: / (homepage)
 * - Auth pages: /login, /auth/error
 * - Protected: All other routes require authentication
 */
export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const pathname = req.nextUrl.pathname;

  // Define route types
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/auth/error");
  const isPublicRoute = pathname === "/";

  // Check for session errors
  if (req.auth?.error && pathname !== "/auth/error") {
    return NextResponse.redirect(new URL("/auth/error", req.nextUrl.origin));
  }

  // Redirect unauthenticated users to login (except for auth pages and public routes)
  if (!isAuthenticated && !isAuthPage && !isPublicRoute) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    // Preserve the original destination for post-login redirect
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages (unless there's an error)
  if (isAuthenticated && isAuthPage && !req.auth?.error) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Allow the request to proceed
  return NextResponse.next();
});

/**
 * Matcher Configuration
 *
 * Specifies which routes the middleware should run on.
 * Excludes:
 * - /api/auth/* - NextAuth API routes (handled internally)
 * - /_next/static/* - Next.js static files
 * - /_next/image/* - Next.js image optimization
 * - /favicon.ico - Favicon requests
 */
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
