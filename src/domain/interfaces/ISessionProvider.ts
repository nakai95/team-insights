import { Result } from "@/lib/result";

/**
 * Interface for retrieving OAuth access tokens from authenticated sessions.
 *
 * This interface abstracts session management, allowing the infrastructure layer
 * to provide tokens without exposing NextAuth details to the domain/application layers.
 *
 * Implementations:
 * - NextAuthAdapter: Production implementation using NextAuth.js v5
 * - MockSessionProvider: Test implementation for unit tests
 */
export interface ISessionProvider {
  /**
   * Retrieve GitHub OAuth access token from current authenticated session.
   *
   * @returns Result containing access token if authenticated, or error if:
   *   - No active session exists
   *   - Session has expired
   *   - Token is missing from session
   *   - Session is in an error state
   *
   * @example
   * ```typescript
   * const tokenResult = await sessionProvider.getAccessToken();
   * if (!tokenResult.ok) {
   *   return err(new Error("Authentication required"));
   * }
   * const octokit = new Octokit({ auth: tokenResult.value });
   * ```
   */
  getAccessToken(): Promise<Result<string>>;
}
