import { Octokit } from "@octokit/rest";
import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";

/**
 * GitHub user information retrieved from the API
 */
interface GitHubUserInfo {
  login: string;
  name: string | null;
  email: string | null;
  id: number;
}

/**
 * EnvTokenAdapter
 *
 * Development-only implementation of ISessionProvider using GITHUB_TOKEN environment variable.
 * Provides an alternative to OAuth for local development and testing.
 *
 * Security Features:
 * - Only works in development mode (NODE_ENV=development)
 * - Validates token format on initialization
 * - Lazy-loads and caches user info from GitHub API
 * - Masks tokens in logs
 *
 * @example
 * ```typescript
 * // Set in .env.local:
 * // GITHUB_TOKEN=ghp_your_token_here
 *
 * const sessionProvider = new EnvTokenAdapter();
 * const tokenResult = await sessionProvider.getAccessToken();
 *
 * if (!tokenResult.ok) {
 *   console.error("Failed to get token:", tokenResult.error);
 *   return;
 * }
 *
 * const octokit = new Octokit({ auth: tokenResult.value });
 * ```
 */
export class EnvTokenAdapter implements ISessionProvider {
  private token: string;
  private userInfoCache?: GitHubUserInfo;

  /**
   * Initialize the adapter with GITHUB_TOKEN from environment.
   *
   * @throws Error if GITHUB_TOKEN is not set
   * @throws Error if NODE_ENV is not development
   * @throws Error if token format is invalid
   */
  constructor() {
    // Validate environment mode
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv !== "development" && nodeEnv !== "test") {
      throw new Error(
        "EnvTokenAdapter can only be used in development or test mode. " +
          "For production, use OAuth authentication.",
      );
    }

    // Read token from environment
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error(
        "GITHUB_TOKEN environment variable is not set. " +
          "Generate a token at: https://github.com/settings/tokens",
      );
    }

    // Validate token format (basic check)
    const validTokenPrefixes = ["ghp_", "gho_", "ghs_", "github_pat_"];
    const hasValidPrefix = validTokenPrefixes.some((prefix) =>
      token.startsWith(prefix),
    );

    if (!hasValidPrefix) {
      throw new Error(
        `Invalid GitHub token format. Token must start with one of: ${validTokenPrefixes.join(", ")}`,
      );
    }

    this.token = token;

    const maskedToken = this.maskToken(token);
    logger.info(
      `EnvTokenAdapter initialized with token: ${maskedToken} (development mode)`,
    );
  }

  /**
   * Retrieve GitHub access token from environment.
   *
   * On first call, fetches and caches user info from GitHub API.
   * Subsequent calls return the cached token immediately.
   *
   * @returns Result<string> containing the access token if valid,
   *          or an error if token is invalid or API call fails
   */
  async getAccessToken(): Promise<Result<string>> {
    // Lazy-load user info on first access
    if (!this.userInfoCache) {
      const userInfoResult = await this.fetchUserInfo();
      if (!userInfoResult.ok) {
        return err(userInfoResult.error);
      }
    }

    return ok(this.token);
  }

  /**
   * Fetch GitHub user information to validate token and cache user details.
   *
   * @returns Result<GitHubUserInfo> containing user info if successful,
   *          or an error if API call fails
   */
  private async fetchUserInfo(): Promise<Result<GitHubUserInfo>> {
    try {
      const octokit = new Octokit({ auth: this.token });

      logger.debug("Fetching GitHub user info to validate token...");

      const { data } = await octokit.rest.users.getAuthenticated();

      this.userInfoCache = {
        login: data.login,
        name: data.name,
        email: data.email,
        id: data.id,
      };

      logger.info(
        `GitHub user authenticated: ${data.login} (${data.name || "No name"})`,
      );

      return ok(this.userInfoCache);
    } catch (error) {
      const maskedToken = this.maskToken(this.token);

      if (error instanceof Error) {
        // Check for common error types
        if (
          error.message.includes("401") ||
          error.message.includes("Bad credentials")
        ) {
          const errorMessage =
            `Invalid or expired GitHub token (${maskedToken}). ` +
            `Please generate a new token at: https://github.com/settings/tokens`;
          logger.error(errorMessage);
          return err(new Error(errorMessage));
        }

        if (error.message.includes("403")) {
          const errorMessage =
            `GitHub token (${maskedToken}) lacks required permissions. ` +
            `Required scopes: read:user, user:email, repo`;
          logger.error(errorMessage);
          return err(new Error(errorMessage));
        }

        // Generic error
        logger.error(`Failed to fetch GitHub user info: ${error.message}`);
        return err(
          new Error(`Failed to validate GitHub token: ${error.message}`),
        );
      }

      // Unknown error type
      logger.error("Failed to fetch GitHub user info: Unknown error");
      return err(new Error("Failed to validate GitHub token: Unknown error"));
    }
  }

  /**
   * Get cached user information (if available).
   *
   * @returns GitHubUserInfo if user info has been fetched, undefined otherwise
   */
  getUserInfo(): GitHubUserInfo | undefined {
    return this.userInfoCache;
  }

  /**
   * Mask token for safe logging.
   *
   * Shows only the prefix and last 4 characters.
   *
   * @param token - GitHub token to mask
   * @returns Masked token string
   *
   * @example
   * maskToken("ghp_1234567890abcdef") // "ghp_***cdef"
   */
  private maskToken(token: string): string {
    if (token.length <= 8) {
      return "***";
    }

    const prefix = token.substring(0, 4);
    const suffix = token.substring(token.length - 4);
    return `${prefix}***${suffix}`;
  }
}
