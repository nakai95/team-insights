import { auth } from "./auth.config";
import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";

/**
 * NextAuthAdapter
 *
 * Production implementation of ISessionProvider using NextAuth.js v5.
 * Retrieves OAuth access tokens from encrypted JWT sessions.
 *
 * Features:
 * - Server-side only (never exposes tokens to client)
 * - Type-safe error handling with Result type
 * - Validates session state and token presence
 * - Handles session errors gracefully
 *
 * @example
 * ```typescript
 * const sessionProvider = new NextAuthAdapter();
 * const tokenResult = await sessionProvider.getAccessToken();
 *
 * if (!tokenResult.ok) {
 *   return err(new Error("Authentication required"));
 * }
 *
 * const octokit = new Octokit({ auth: tokenResult.value });
 * ```
 */
export class NextAuthAdapter implements ISessionProvider {
  /**
   * Retrieve GitHub OAuth access token from the current session.
   *
   * @returns Result<string> containing the access token if authenticated,
   *          or an error if no valid session exists
   */
  async getAccessToken(): Promise<Result<string>> {
    // Retrieve current session from NextAuth
    const session = await auth();

    // Check if session exists
    if (!session) {
      return err(new Error("No active session"));
    }

    // Check for session errors (e.g., token refresh failed)
    if (session.error) {
      return err(new Error(`Session error: ${session.error}`));
    }

    // Check if access token is present in session
    if (!session.accessToken) {
      return err(new Error("No access token in session"));
    }

    // Return the access token
    return ok(session.accessToken);
  }
}
