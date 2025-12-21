import { handlers } from "@/infrastructure/auth/auth.config";

/**
 * NextAuth.js v5 Route Handler
 *
 * Catch-all route handler for NextAuth authentication endpoints.
 * Handles all OAuth flows including:
 * - GET /api/auth/signin - Sign in page
 * - POST /api/auth/signin/:provider - Initiate OAuth flow
 * - GET /api/auth/callback/:provider - OAuth callback handler
 * - POST /api/auth/signout - Sign out handler
 * - GET /api/auth/session - Get current session
 * - GET /api/auth/csrf - Get CSRF token
 *
 * NextAuth v5 requires explicit export of GET and POST handlers
 * from the centralized auth configuration.
 */
export const { GET, POST } = handlers;
