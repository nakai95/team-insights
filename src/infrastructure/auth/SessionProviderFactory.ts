import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { EnvTokenAdapter } from "./EnvTokenAdapter";
import { NextAuthAdapter } from "./NextAuthAdapter";
import { logger } from "@/lib/utils/logger";

/**
 * Factory function to create the appropriate session provider based on environment configuration.
 *
 * Selection Logic:
 * 1. If GITHUB_TOKEN is set and NODE_ENV=development → EnvTokenAdapter
 * 2. Otherwise → NextAuthAdapter (OAuth)
 *
 * @returns ISessionProvider instance (EnvTokenAdapter or NextAuthAdapter)
 * @throws Error if GITHUB_TOKEN is set but NODE_ENV is not development
 *
 * @example
 * ```typescript
 * // In your application code:
 * const sessionProvider = createSessionProvider();
 * const tokenResult = await sessionProvider.getAccessToken();
 *
 * if (!tokenResult.ok) {
 *   console.error("Authentication failed:", tokenResult.error);
 *   return;
 * }
 *
 * const octokit = new Octokit({ auth: tokenResult.value });
 * ```
 */
export function createSessionProvider(): ISessionProvider {
  const hasGitHubToken = !!process.env.GITHUB_TOKEN;
  const nodeEnv = process.env.NODE_ENV;

  // Environment token mode (development only)
  if (hasGitHubToken) {
    // Enforce development mode
    if (nodeEnv !== "development" && nodeEnv !== "test") {
      throw new Error(
        "GITHUB_TOKEN can only be used in development or test mode. " +
          "Remove GITHUB_TOKEN from environment or set NODE_ENV=development. " +
          "For production, use OAuth authentication (AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, AUTH_SECRET).",
      );
    }

    logger.info(
      "Creating EnvTokenAdapter (authentication via GITHUB_TOKEN environment variable)",
    );
    return new EnvTokenAdapter();
  }

  // OAuth mode (default)
  logger.info("Creating NextAuthAdapter (authentication via OAuth)");
  return new NextAuthAdapter();
}
