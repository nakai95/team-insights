import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";

/**
 * MockSessionProvider
 *
 * Test implementation of ISessionProvider for unit testing.
 * Allows explicit control of token values and error states.
 *
 * @example
 * ```typescript
 * // Test with valid token
 * const provider = new MockSessionProvider("ghp_testToken123");
 * const result = await provider.getAccessToken();
 * expect(result.ok).toBe(true);
 *
 * // Test with no token (unauthenticated)
 * const provider = new MockSessionProvider();
 * const result = await provider.getAccessToken();
 * expect(result.ok).toBe(false);
 *
 * // Test changing token state
 * const provider = new MockSessionProvider();
 * provider.setToken("ghp_newToken");
 * provider.clearToken();
 * ```
 */
export class MockSessionProvider implements ISessionProvider {
  private mockToken?: string;
  private mockError?: string;

  /**
   * Create a new MockSessionProvider
   * @param mockToken Optional initial token value
   */
  constructor(mockToken?: string) {
    this.mockToken = mockToken;
  }

  /**
   * Get the mocked access token
   * @returns Result containing the mock token if set, or error if not
   */
  async getAccessToken(): Promise<Result<string>> {
    // Return error if explicitly set
    if (this.mockError) {
      return err(new Error(this.mockError));
    }

    // Return error if no token available
    if (!this.mockToken) {
      return err(new Error("No active session"));
    }

    // Return the mock token
    return ok(this.mockToken);
  }

  /**
   * Set the mock token value
   * Useful for testing authenticated scenarios
   * @param token The token to return from getAccessToken()
   */
  setToken(token: string): void {
    this.mockToken = token;
    this.mockError = undefined; // Clear any error when setting token
  }

  /**
   * Clear the mock token
   * Useful for testing unauthenticated scenarios
   */
  clearToken(): void {
    this.mockToken = undefined;
    this.mockError = undefined;
  }

  /**
   * Set an error to be returned by getAccessToken()
   * Useful for testing error handling scenarios
   * @param error The error message to return
   */
  setError(error: string): void {
    this.mockError = error;
    this.mockToken = undefined; // Clear token when setting error
  }

  /**
   * Check if a token is currently set
   * @returns true if token is set, false otherwise
   */
  hasToken(): boolean {
    return !!this.mockToken && !this.mockError;
  }
}
