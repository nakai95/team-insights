/**
 * GitHub GraphQL Error Handling Utilities
 *
 * This module provides centralized error handling for GitHub GraphQL API errors.
 * It maps GraphQL error responses to user-friendly error messages.
 */

import { GraphqlResponseError } from "@octokit/graphql";
import { Result, err } from "@/lib/result";
import { logger } from "@/lib/utils/logger";

/**
 * Handle GraphQL errors and map to REST-equivalent error messages
 * Provides consistent error handling across all GraphQL operations
 *
 * @param error The error that occurred
 * @param operation Description of the operation that failed (e.g., "fetching pull requests")
 * @returns Result type with appropriate error message
 */
export function handleGraphQLError(
  error: unknown,
  operation: string,
): Result<never> {
  if (error instanceof GraphqlResponseError) {
    const status = error.headers.status;

    logger.error(`GraphQL error while ${operation}`, {
      error: error.message,
      status,
    });

    if (status === "401") {
      return err(new Error("Invalid GitHub token. Please sign in again."));
    }

    if (status === "403") {
      return err(
        new Error(
          "You do not have permission to access this repository. Please verify you have read access or that the repository is not private.",
        ),
      );
    }

    if (status === "404") {
      return err(
        new Error(
          "Repository not found or you do not have permission to access it. Please check the repository URL and your access rights.",
        ),
      );
    }

    return err(new Error(`Failed to ${operation}: ${error.message}`));
  }

  // Non-GraphQL errors
  const errorMessage =
    error instanceof GraphqlResponseError ? error.message : String(error);

  logger.error(`GraphQL error while ${operation}`, {
    error: errorMessage,
  });

  return err(new Error(`Failed to ${operation}: ${errorMessage}`));
}

/**
 * Parse owner and repo from GitHub URL
 * Supports multiple GitHub URL formats
 *
 * @param url GitHub repository URL
 * @returns Object with owner and repo, or null if invalid
 *
 * @example
 * parseGitHubUrl("https://github.com/owner/repo") // { owner: "owner", repo: "repo" }
 * parseGitHubUrl("git@github.com:owner/repo.git") // { owner: "owner", repo: "repo" }
 */
export function parseGitHubUrl(
  url: string,
): { owner: string; repo: string } | null {
  // Match patterns like:
  // - https://github.com/owner/repo
  // - https://github.com/owner/repo.git
  // - git@github.com:owner/repo.git
  const httpsMatch = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (httpsMatch && httpsMatch[1] && httpsMatch[2]) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  return null;
}
