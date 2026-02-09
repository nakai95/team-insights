import { auth } from "@/infrastructure/auth/auth.config";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { isEnvTokenMode } from "@/infrastructure/auth/env.schema";

const { locales, defaultLocale } = routing;

// Create the next-intl middleware
const handleI18nRouting = createMiddleware(routing);

/**
 * Combined Middleware: i18n + Route Protection
 *
 * Handles locale routing and authentication checks for all routes.
 * Runs before page rendering for optimal performance.
 *
 * Process:
 * 1. Handle i18n routing (including / -> /en redirect)
 * 2. Check authentication status
 * 3. Protect routes that require authentication
 * 4. Redirect authenticated users away from auth pages
 *
 * Route Patterns:
 * - Public: /[locale] (landing page), /[locale]/privacy, /[locale]/terms
 * - Auth pages: /[locale]/login, /[locale]/auth/error
 * - Protected: /[locale]/analytics and all other routes
 */
export default auth((req) => {
  // Step 1: Handle i18n routing first
  const response = handleI18nRouting(req);

  // If i18n middleware is redirecting, return early
  if (response.status === 307 || response.status === 308) {
    return response;
  }

  // Step 2: Authentication logic
  // Check both OAuth session and environment token mode
  const isEnvToken = isEnvTokenMode();
  const isAuthenticated = isEnvToken || !!req.auth;
  const pathname = req.nextUrl.pathname;

  // Extract locale from pathname (e.g., /en/dashboard -> en)
  const pathnameLocale = pathname.split("/")[1];
  const locale = locales.includes(pathnameLocale as any)
    ? pathnameLocale
    : defaultLocale;

  // Define route types
  const isAuthPage =
    pathname.startsWith(`/${locale}/login`) ||
    pathname.startsWith(`/${locale}/auth/error`);
  const isPublicRoute =
    pathname === `/${locale}` ||
    pathname === `/${locale}/privacy` ||
    pathname === `/${locale}/terms`;

  // Handle session errors (skip in env token mode)
  if (!isEnvToken && req.auth?.error && pathname !== `/${locale}/auth/error`) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/error`, req.nextUrl.origin),
    );
  }

  // Redirect authenticated users from homepage to analytics
  if (isAuthenticated && pathname === `/${locale}`) {
    return NextResponse.redirect(
      new URL(`/${locale}/analytics`, req.nextUrl.origin),
    );
  }

  // Redirect unauthenticated users to login (except for auth pages and public routes)
  if (!isAuthenticated && !isAuthPage && !isPublicRoute) {
    const loginUrl = new URL(`/${locale}/login`, req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages to analytics
  // In env token mode, allow access to login page to show status
  if (isAuthenticated && isAuthPage && !req.auth?.error && !isEnvToken) {
    return NextResponse.redirect(
      new URL(`/${locale}/analytics`, req.nextUrl.origin),
    );
  }

  // Allow the request to proceed
  return response;
});

/**
 * Matcher Configuration
 *
 * Specifies which routes the middleware should run on.
 * IMPORTANT: Explicitly include '/' to handle root path redirect.
 * Match all pathnames except for:
 * - /api/* - API routes (including NextAuth)
 * - /_next/* - Next.js internal files
 * - /_vercel/* - Vercel internal files
 * - Files with extensions (e.g. favicon.ico, images, etc.)
 */
export const config = {
  matcher: ["/", "/((?!api|_next|_vercel|.*\\..*).+)"],
};
